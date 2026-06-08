import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getViewerEntitlements, loadViewableFeed } from "@/lib/content/store";
import { PortalFeed, type FeedItem } from "./portal-feed";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };


const TIER_NAME: Record<string, string> = { the_gallery: "The Gallery", private_world: "Private World", all_access: "All Access" };

export default async function PortalPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/portal");

  const admin = createAdminClient();
  const ent = await getViewerEntitlements(admin, user.id);
  const feed = await loadViewableFeed(admin, ent);

  return (
    <div className="bg-black text-neutral-100 min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-14">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">The Portal</h1>
          <p className="mt-2 opacity-70">
            {ent.tier ? `Your ${TIER_NAME[ent.tier] ?? ""} access` : "Your content"} · the last 4 weeks
          </p>
          <p className="mx-auto mt-4 max-w-lg text-xs text-neutral-500">
            All content here is personal and private. Every photo and video is watermarked and traceable to your account — downloading, screenshotting or sharing is strictly prohibited.
          </p>
          <div className="mt-5 flex justify-center gap-3 text-sm">
            <Link href="/portal/vault" className="rounded-full border border-amber-500/50 px-5 py-2 text-amber-400 hover:bg-amber-500/10">Enter The Vault →</Link>
            {!ent.tier && <Link href="/subscribe" className="rounded-full bg-amber-500 px-5 py-2 font-medium text-black hover:bg-amber-400">Become a member</Link>}
          </div>
        </header>

        {feed.length === 0 ? (
          <div className="rounded-2xl border border-neutral-800 p-10 text-center text-neutral-400">
            <p>Nothing here for your access yet.</p>
            {!ent.tier && <p className="mt-2 text-sm">Join a membership to unlock content, or visit the Vault.</p>}
          </div>
        ) : (
          <PortalFeed items={feed as FeedItem[]} watermark={user.email ?? "members only"} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
