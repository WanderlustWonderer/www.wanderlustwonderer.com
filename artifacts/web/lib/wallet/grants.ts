/** Pure wallet logic — no IO, fully unit-testable. */

export type Pot = "subscription" | "purchased";
export interface PotBalances { subscription: number; purchased: number; }
export interface LedgerEntryPlan { reason: string; delta: number; pot: Pot; stripe_event_id: string; }

const GRANTS: Record<string, number> = { the_gallery: 5, private_world: 8, all_access: 15 };

export function monthlyGrantAmount(tier: string | null | undefined): number {
  return tier ? (GRANTS[tier] ?? 0) : 0;
}

/** Spend order: expiring subscription credits first, then purchased. */
export function pickSpendPot(b: PotBalances): Pot | null {
  if (b.subscription > 0) return "subscription";
  if (b.purchased > 0) return "purchased";
  return null;
}

/**
 * On renewal (or cancel with tier=null): void whatever is left in the
 * subscription pot, then grant the tier's fresh monthly credits.
 */
export function planRenewalEntries(tier: string | null, remainingSub: number, idemKey: string): LedgerEntryPlan[] {
  const entries: LedgerEntryPlan[] = [];
  if (remainingSub > 0) {
    entries.push({ reason: "monthly_void", delta: -remainingSub, pot: "subscription", stripe_event_id: idemKey });
  }
  const grant = monthlyGrantAmount(tier);
  if (grant > 0) {
    entries.push({ reason: "monthly_grant", delta: grant, pot: "subscription", stripe_event_id: idemKey });
  }
  return entries;
}
