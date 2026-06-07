import "server-only";
import Stripe from "stripe";
import { CREDIT_PACKS, TIERS, type TierKey } from "@/config/creator";

let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (!cached) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set");
    cached = new Stripe(process.env.STRIPE_SECRET_KEY, { typescript: true });
  }
  return cached;
}

/** Resolve a subscription tier's Stripe price ID from env. */
export function priceIdForTier(tier: TierKey): string | null {
  const env = TIERS[tier]?.priceEnv;
  return env ? (process.env[env] ?? null) : null;
}

export function priceIdForPack(key: "small" | "large"): string | null {
  const pack = CREDIT_PACKS.find((p) => p.key === key);
  return pack ? (process.env[pack.priceEnv] ?? null) : null;
}

/** Map a Stripe price ID back to a tier (for webhook events). */
export function tierFromPriceId(priceId: string | null | undefined): TierKey | null {
  if (!priceId) return null;
  for (const tier of ["fan", "vip", "inner"] as const) {
    if (priceIdForTier(tier) === priceId) return tier;
  }
  return null;
}

export function creditsFromPriceId(priceId: string | null | undefined): number | null {
  if (!priceId) return null;
  for (const pack of CREDIT_PACKS) {
    if (process.env[pack.priceEnv] === priceId) return pack.credits;
  }
  return null;
}
