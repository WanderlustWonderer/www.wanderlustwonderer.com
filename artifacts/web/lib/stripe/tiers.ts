import type { Database } from '@/types/database'

export type MembershipTier = Database['public']['Enums']['membership_tier']

/**
 * Maps every Stripe price ID — current AND legacy MemberPress-era — to a
 * membership tier. Legacy members keep billing on archived prices; this map
 * is what keeps their access intact in the new platform.
 */
export const PRICE_TO_TIER: Record<string, MembershipTier> = {
  // --- Current prices (created 2026-06-07, live mode) ---
  price_1TfgotFrwEdhsReH6o0HVXsG: 'the_gallery', // £55/mo
  price_1TfgouFrwEdhsReHCgCj6WaY: 'private_world', // £100/mo
  price_1TfgovFrwEdhsReHzZb2duoO: 'all_access', // £250/mo

  // --- Legacy prices (archived, but active subscriptions remain) ---
  plan_UTI5Z9nAy2eZmT: 'the_gallery', // £55/mo legacy "The Gallery"
  plan_UG1T7srryyur5g: 'private_world', // £100/mo legacy "Private World"
  plan_UG1aIHfTZlABho: 'all_access', // £250/mo legacy "All Access"
  // Inner Circle (£40/mo) is not part of the new 3-tier model.
  // Grandfathered to entry tier so the member keeps access. See README.
  plan_UG1twfC45f6vCh: 'the_gallery',

  // --- Multi-month prices (created 2026, live mode) ---
  price_1TgpOAFrwEdhsReHnLUPDSXv: 'the_gallery',   // 3mo
  price_1TgpOCFrwEdhsReHZZeyWBN2: 'the_gallery',   // 6mo
  price_1TgpODFrwEdhsReHPaN1zUMa: 'private_world', // 3mo
  price_1TgpOEFrwEdhsReH4CQS6HIK: 'private_world', // 6mo
  price_1TgpOGFrwEdhsReHNa6FgG3J: 'all_access',    // 3mo
  price_1TgpOHFrwEdhsReHEp4l1TZk: 'all_access',    // 6mo
  // --- Annual prices (created 2026, live mode, 2 months free) ---
  price_1TgqkIFrwEdhsReHWfLdGoM4: 'the_gallery',   // annual
  price_1TgqkJFrwEdhsReHcGj8z0l7: 'private_world', // annual
  price_1TgqkMFrwEdhsReHOHFp1dmE: 'all_access',    // annual
}

/** Tier price IDs to use for NEW checkouts (env-overridable). */
export const TIER_PRICE_IDS: Record<MembershipTier, string> = {
  the_gallery:
    process.env.STRIPE_PRICE_THE_GALLERY ?? 'price_1TfgotFrwEdhsReH6o0HVXsG',
  private_world:
    process.env.STRIPE_PRICE_PRIVATE_WORLD ?? 'price_1TfgouFrwEdhsReHCgCj6WaY',
  all_access:
    process.env.STRIPE_PRICE_ALL_ACCESS ?? 'price_1TfgovFrwEdhsReHzZb2duoO',
}

export type BillingTerm = 'monthly' | 'quarter' | 'biannual' | 'annual'

/** Price IDs per tier per billing term. Longer terms are discounted. */
export const TERM_PRICE_IDS: Record<MembershipTier, Record<BillingTerm, string>> = {
  the_gallery: { monthly: TIER_PRICE_IDS.the_gallery, quarter: 'price_1TgpOAFrwEdhsReHnLUPDSXv', biannual: 'price_1TgpOCFrwEdhsReHZZeyWBN2', annual: 'price_1TgqkIFrwEdhsReHWfLdGoM4' },
  private_world: { monthly: TIER_PRICE_IDS.private_world, quarter: 'price_1TgpODFrwEdhsReHPaN1zUMa', biannual: 'price_1TgpOEFrwEdhsReH4CQS6HIK', annual: 'price_1TgqkJFrwEdhsReHcGj8z0l7' },
  all_access: { monthly: TIER_PRICE_IDS.all_access, quarter: 'price_1TgpOGFrwEdhsReHNa6FgG3J', biannual: 'price_1TgpOHFrwEdhsReHEp4l1TZk', annual: 'price_1TgqkMFrwEdhsReHOHFp1dmE' },
}

const TIER_RANK: Record<MembershipTier, number> = {
  the_gallery: 1,
  private_world: 2,
  all_access: 3,
}

export function tierRank(tier: MembershipTier | null | undefined): number {
  return tier ? TIER_RANK[tier] : 0
}

/** Pick the highest tier when a customer has multiple subscriptions. */
export function highestTier(
  tiers: (MembershipTier | undefined)[],
): MembershipTier | null {
  let best: MembershipTier | null = null
  for (const t of tiers) {
    if (t && tierRank(t) > tierRank(best)) best = t
  }
  return best
}

/** Stripe subscription statuses that grant portal access. */
export const ACCESS_GRANTING_STATUSES = ['active', 'trialing'] as const

export function grantsAccess(status: string): boolean {
  return (ACCESS_GRANTING_STATUSES as readonly string[]).includes(status)
}


/** Annual price IDs — buyers become Founders. */
export const ANNUAL_PRICE_IDS: string[] = [
  'price_1TgqkIFrwEdhsReHWfLdGoM4',
  'price_1TgqkJFrwEdhsReHcGj8z0l7',
  'price_1TgqkMFrwEdhsReHOHFp1dmE',
]
