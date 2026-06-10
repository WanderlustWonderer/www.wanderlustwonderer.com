import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { planRenewalEntries, type Pot, type PotBalances } from "./grants";

export async function balances(admin: SupabaseClient, profileId: string): Promise<PotBalances & { total: number }> {
  const { data } = await admin.from("credit_ledger").select("delta, pot").eq("profile_id", profileId);
  const b: PotBalances = { subscription: 0, purchased: 0 };
  for (const row of data ?? []) {
    const pot: Pot = row.pot === "subscription" ? "subscription" : "purchased";
    b[pot] += row.delta;
  }
  return { ...b, total: b.subscription + b.purchased };
}

/**
 * Deduct one credit atomically (subscription pot first).
 * Delegates to the `spend_credit` Postgres function, which takes a per-profile
 * advisory lock and recomputes the balance inside the transaction — so two
 * concurrent sends can't both spend the same credit (no double-spend / no
 * negative balance). Returns the pot used, or null if broke.
 */
export async function spendCredit(admin: SupabaseClient, profileId: string): Promise<Pot | null> {
  const { data, error } = await admin.rpc("spend_credit", { p_profile_id: profileId });
  if (error) throw error;
  return (data as Pot | null) ?? null;
}

export async function refundCredit(admin: SupabaseClient, profileId: string, pot: Pot): Promise<void> {
  await admin.from("credit_ledger").insert({ profile_id: profileId, delta: 1, reason: "auto_refund", pot });
}

/** Idempotent void+grant for a billing period (idemKey = subId:periodEnd). */
export async function applyRenewal(admin: SupabaseClient, profileId: string, tier: string | null, idemKey: string): Promise<void> {
  const { data: existing } = await admin
    .from("credit_ledger")
    .select("id")
    .eq("stripe_event_id", idemKey)
    .limit(1);
  if (existing && existing.length > 0) return;
  const b = await balances(admin, profileId);
  const rows = planRenewalEntries(tier, Math.max(0, b.subscription), idemKey).map((e) => ({ ...e, profile_id: profileId }));
  if (rows.length) {
    const { error } = await admin.from("credit_ledger").insert(rows);
    if (error) throw error;
  }
}

export async function grantPurchase(admin: SupabaseClient, profileId: string, credits: number, eventId: string): Promise<void> {
  await admin.from("credit_ledger").insert({
    profile_id: profileId,
    delta: credits,
    reason: "credit_purchase",
    pot: "purchased",
    stripe_event_id: eventId,
  });
}
