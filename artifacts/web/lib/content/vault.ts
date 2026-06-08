/** Pure content/vault logic — period math + visibility decisions. */

export const LIVE_WINDOW_DAYS = 28;
export const PERIOD_DAYS = 28;
// Fixed anchor so 4-week blocks are stable (don't shift daily).
export const CONTENT_EPOCH = Date.UTC(2026, 0, 1); // 2026-01-01

export type Tier = "the_gallery" | "private_world" | "all_access";
const TIER_RANK: Record<string, number> = { the_gallery: 1, private_world: 2, all_access: 3 };

export function tierRank(t: string | null | undefined): number {
  return t ? (TIER_RANK[t] ?? 0) : 0;
}

/** A content item is "live" (in the rolling window) if published within LIVE_WINDOW_DAYS. */
export function isLive(publishedAtIso: string | null, now: number = Date.now()): boolean {
  if (!publishedAtIso) return false;
  const p = new Date(publishedAtIso).getTime();
  return p <= now && p >= now - LIVE_WINDOW_DAYS * 86400000;
}

/** Stable 28-day period index from the epoch (used to define purchasable archive blocks). */
export function periodKey(publishedAtIso: string | null): number {
  if (!publishedAtIso) return 0;
  const p = new Date(publishedAtIso).getTime();
  return Math.floor((p - CONTENT_EPOCH) / (PERIOD_DAYS * 86400000));
}

export function periodRange(key: number): { startIso: string; endIso: string } {
  const start = CONTENT_EPOCH + key * PERIOD_DAYS * 86400000;
  const end = start + PERIOD_DAYS * 86400000 - 1;
  return { startIso: new Date(start).toISOString(), endIso: new Date(end).toISOString() };
}

export interface ViewerEntitlements {
  tier: string | null;        // subscription tier (null = guest/none)
  vaultFull: boolean;          // bought Full Vault
  blocks: Set<number>;         // period keys bought individually
}

export interface ContentRow {
  id: string;
  min_tier: string;
  published_at: string | null;
}

/** Can this viewer VIEW this content item? */
export function canView(item: ContentRow, ent: ViewerEntitlements, now: number = Date.now()): boolean {
  if (isLive(item.published_at, now)) {
    // Live window: gated by subscription tier (cumulative).
    return tierRank(ent.tier) >= tierRank(item.min_tier);
  }
  // Archived: gated by vault purchases (all tiers).
  if (ent.vaultFull) return true;
  return ent.blocks.has(periodKey(item.published_at));
}
