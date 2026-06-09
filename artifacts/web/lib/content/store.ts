import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { canView, periodKey, periodRange, weekKey, weekRange, isLive, type ViewerEntitlements } from "./vault";

export const VAULT_FULL_PRICE = process.env.STRIPE_PRICE_VAULT_FULL ?? "price_1Tg45LFrwEdhsReHxiCeX3Cx";
export const VAULT_BLOCK_PRICE = process.env.STRIPE_PRICE_VAULT_BLOCK ?? "price_1Tg45MFrwEdhsReHmd6Qsolg";

export interface FeedItem {
  id: string;
  title: string;
  caption: string | null;
  content_type: string;
  min_tier: string;
  published_at: string | null;
  live: boolean;
  media: { kind: string; url: string }[];
}

export async function getViewerEntitlements(admin: SupabaseClient, userId: string): Promise<ViewerEntitlements> {
  const [{ data: profile }, { data: ents }] = await Promise.all([
    admin.from("profiles").select("membership_tier, subscription_status").eq("id", userId).maybeSingle(),
    admin.from("content_entitlements").select("scope, period_key").eq("profile_id", userId),
  ]);
  const active = !!profile?.subscription_status && ["active", "trialing"].includes(profile.subscription_status);
  const blocks = new Set<number>();
  const weeks = new Set<number>();
  let vaultFull = false;
  for (const e of ents ?? []) {
    if (e.scope === "vault_full") vaultFull = true;
    else if (e.scope === "block" && e.period_key != null) blocks.add(e.period_key);
    else if (e.scope === "week" && e.period_key != null) weeks.add(e.period_key);
  }
  return { tier: active ? (profile?.membership_tier ?? null) : null, vaultFull, blocks, weeks };
}

async function sign(admin: SupabaseClient, path: string): Promise<string | null> {
  const { data } = await admin.storage.from("portal-content").createSignedUrl(path, 600);
  return data?.signedUrl ?? null;
}

/** All content the viewer can currently access (live within tier + unlocked archive), newest first. */
export async function loadViewableFeed(admin: SupabaseClient, ent: ViewerEntitlements): Promise<FeedItem[]> {
  const { data: items } = await admin
    .from("content_items")
    .select("id, title, body, content_type, min_tier, published_at, content_media(media_kind, storage_path, position)")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(400);

  const out: FeedItem[] = [];
  for (const it of (items ?? []) as any[]) {
    if (!canView({ id: it.id, min_tier: it.min_tier, published_at: it.published_at }, ent)) continue;
    const mediaRows = (it.content_media ?? []).sort((a: any, b: any) => a.position - b.position);
    const media = (await Promise.all(mediaRows.map(async (m: any) => {
      const url = await sign(admin, m.storage_path);
      return url ? { kind: m.media_kind, url } : null;
    }))).filter(Boolean) as { kind: string; url: string }[];
    out.push({
      id: it.id, title: it.title, caption: it.body, content_type: it.content_type,
      min_tier: it.min_tier, published_at: it.published_at, live: isLive(it.published_at), media,
    });
  }
  return out;
}

export interface ArchiveWeek { weekKey: number; title: string; rangeLabel: string; count: number; owned: boolean; }

export const WEEK_PRICE_PENCE = 15000;        // £150 per week
export const BULK_MIN_WEEKS = 4;              // 4+ weeks → discount
export const BULK_DISCOUNT = 0.2;             // 20% off
export const MAX_WEEKS_PER_ORDER = 20;

/** Price (in pence) for N weeks, applying the 4+ bulk discount. */
export function weeksPricePence(count: number): number {
  const gross = count * WEEK_PRICE_PENCE;
  return count >= BULK_MIN_WEEKS ? Math.round(gross * (1 - BULK_DISCOUNT)) : gross;
}

/** Archived weeks available to buy — each titled, with item count + whether owned. */
export async function listArchiveWeeks(admin: SupabaseClient, ent: ViewerEntitlements): Promise<ArchiveWeek[]> {
  const [{ data: items }, { data: titles }] = await Promise.all([
    admin.from("content_items").select("published_at").not("published_at", "is", null).limit(2000),
    admin.from("vault_weeks").select("week_key, title"),
  ]);
  const titleByKey = new Map<number, string>();
  for (const t of (titles ?? []) as any[]) if (t.title) titleByKey.set(t.week_key, t.title);

  const counts = new Map<number, number>();
  for (const it of (items ?? []) as any[]) {
    if (isLive(it.published_at)) continue; // live content isn't in the vault yet
    const k = weekKey(it.published_at);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const weeks: ArchiveWeek[] = [];
  for (const [k, count] of [...counts.entries()].sort((a, b) => b[0] - a[0])) {
    const r = weekRange(k);
    const rangeLabel = `${new Date(r.startIso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${new Date(r.endIso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
    weeks.push({
      weekKey: k,
      title: titleByKey.get(k) ?? `Week of ${rangeLabel}`,
      rangeLabel, count,
      owned: ent.vaultFull || ent.weeks.has(k),
    });
  }
  return weeks;
}
