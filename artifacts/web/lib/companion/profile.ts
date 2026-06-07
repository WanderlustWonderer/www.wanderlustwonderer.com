import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { CREATOR, SIGNUP_BONUS_CREDITS } from "@/config/creator";

export interface CompanionProfile {
  id: string;
  creator_id: string;
  display_name: string | null;
  tier: "free" | "fan" | "vip" | "inner";
  age_confirmed_at: string | null;
  memory_summary: string;
  stripe_customer_id: string | null;
}

/**
 * Lazy profile creation: on first chat/checkout, create the companion profile
 * and grant the signup bonus credits. Idempotent.
 */
export async function ensureCompanionProfile(
  admin: SupabaseClient,
  userId: string,
  displayName?: string | null,
  ageConfirmedAt?: string | null
): Promise<CompanionProfile> {
  const { data: existing } = await admin
    .from("companion_profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (existing) return existing as CompanionProfile;

  const { data: creator, error: creatorError } = await admin
    .from("creators")
    .select("id")
    .eq("slug", CREATOR.slug)
    .single();
  if (creatorError || !creator) throw new Error("Creator row missing");

  const { data: created, error: insertError } = await admin
    .from("companion_profiles")
    .insert({
      id: userId,
      creator_id: creator.id,
      display_name: displayName ?? null,
      age_confirmed_at: ageConfirmedAt ?? null,
    })
    .select("*")
    .single();

  if (insertError) {
    // Raced with another request — fetch the winner.
    const { data: raced } = await admin
      .from("companion_profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (raced) return raced as CompanionProfile;
    throw insertError;
  }

  await admin.from("credit_ledger").insert({
    profile_id: userId,
    delta: SIGNUP_BONUS_CREDITS,
    reason: "signup_bonus",
    pot: "purchased",
  });

  return created as CompanionProfile;
}
