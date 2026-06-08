import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { canView, periodKey, periodRange, isLive, type ViewerEntitlements } from "./vault";

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
  let vaultFull = false;
  for (const e of ents ?? []) {
    if (e.scope === "vault_full") vaultFull = true;
    else if (e.scope === "block" && e.period_key != null) blocks.add(e.period_key);
  }
  return { tier: active ? (profile?.membership_tier ?? null) : null, vaultFull, blocks };
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

export interface ArchiveBlock { periodKey: number; label: string; count: number; owned: boolean; }

/** Archived 4-week blocks available to buy (with how many items + whether owned). */
export async function listArchiveBlocks(admin: SupabaseClient, ent: ViewerEntitlements): Promise<ArchiveBlock[]> {
  const { data: items } = await admin
    .from("content_items")
    .select("published_at")
    .not("published_at", "is", null)
    .limit(1000);
  const counts = new Map<number, number>();
  for (const it of (items ?? []) as any[]) {
    if (isLive(it.published_at)) continue; // live content isn't in the vault
    const k = periodKey(it.published_at);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const blocks: ArchiveBlock[] = [];
  for (const [k, count] of [...counts.entries()].sort((a, b) => b[0] - a[0])) {
    const r = periodRange(k);
    const label = `${new Date(r.startIso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${new Date(r.endIso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;
    blocks.push({ periodKey: k, label, count, owned: ent.vaultFull || ent.blocks.has(k) });
  }
  return blocks;
}
