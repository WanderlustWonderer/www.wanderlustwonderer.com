import "server-only";
import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export const REFERRAL_BONUS = 3; // free message credits granted to each side

/** Deterministic short referral code from the user id (stable, collision-safe). */
export function codeFor(userId: string): string {
  return crypto.createHash("sha256").update(userId).digest("hex").slice(0, 8);
}

/** Ensure the profile has a referral code; returns it. */
export async function ensureReferralCode(admin: SupabaseClient, userId: string, existing: string | null): Promise<string> {
  if (existing) return existing;
  const code = codeFor(userId);
  await admin.from("profiles").update({ referral_code: code }).eq("id", userId).is("referral_code", null);
  return code;
}

/**
 * Apply a pending referral (from the ww_ref cookie) exactly once: links the new
 * member to their referrer and grants REFERRAL_BONUS credits to BOTH.
 */
export async function applyReferral(
  admin: SupabaseClient, userId: string, alreadyReferredBy: string | null, refCode: string | null
): Promise<boolean> {
  if (alreadyReferredBy || !refCode) return false;
  const code = refCode.trim().toLowerCase();
  if (code === codeFor(userId)) return false; // no self-referral
  const { data: referrer } = await admin.from("profiles").select("id").eq("referral_code", code).maybeSingle();
  if (!referrer || referrer.id === userId) return false;

  // Atomically claim: only set if still unreferred.
  const { data: claimed } = await admin
    .from("profiles").update({ referred_by: referrer.id })
    .eq("id", userId).is("referred_by", null).select("id").maybeSingle();
  if (!claimed) return false; // raced / already referred

  await admin.from("credit_ledger").insert([
    { profile_id: userId, delta: REFERRAL_BONUS, reason: "referral_bonus", pot: "purchased" },
    { profile_id: referrer.id, delta: REFERRAL_BONUS, reason: "referral_bonus", pot: "purchased" },
  ]);
  return true;
}

/** Referral stats for the account page. */
export async function referralStats(admin: SupabaseClient, userId: string): Promise<{ count: number; earned: number }> {
  const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("referred_by", userId);
  const { data: ledger } = await admin.from("credit_ledger").select("delta").eq("profile_id", userId).eq("reason", "referral_bonus");
  const earned = (ledger ?? []).reduce((s: number, r: { delta: number }) => s + (r.delta > 0 ? r.delta : 0), 0);
  return { count: count ?? 0, earned };
}
