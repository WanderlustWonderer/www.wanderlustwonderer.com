import { TIERS, type TierKey } from "@/config/creator";

export interface EntitlementInput {
  tier: TierKey;
  usedToday: number; // fan messages sent today
  creditBalance: number;
}

export type EntitlementDecision =
  | { allow: true; via: "allowance"; remainingAllowance: number }
  | { allow: true; via: "credit"; creditBalanceAfter: number }
  | { allow: false; reason: "subscribe_or_topup" | "topup" };

export function dailyLimit(tier: TierKey): number {
  return TIERS[tier]?.dailyMessages ?? 0;
}

export function memoryDepth(tier: TierKey): number {
  return TIERS[tier]?.memoryDepth ?? TIERS.free.memoryDepth;
}

/**
 * Entitlement order per message: daily allowance → credits → deny.
 * Deny reason tells the UI which upsell to show:
 *  - free users → subscribe_or_topup
 *  - subscribers who ran out → topup
 */
export function decideEntitlement(input: EntitlementInput): EntitlementDecision {
  const limit = dailyLimit(input.tier);
  if (limit > 0 && input.usedToday < limit) {
    return { allow: true, via: "allowance", remainingAllowance: limit - input.usedToday - 1 };
  }
  if (input.creditBalance > 0) {
    return { allow: true, via: "credit", creditBalanceAfter: input.creditBalance - 1 };
  }
  return { allow: false, reason: input.tier === "free" ? "subscribe_or_topup" : "topup" };
}

export function isPaidTier(tier: TierKey): boolean {
  return tier === "fan" || tier === "vip" || tier === "inner";
}
