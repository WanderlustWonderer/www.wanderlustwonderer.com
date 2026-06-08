import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getViewerEntitlements, loadViewableFeed } from "@/lib/content/store";
import { ProtectedMedia } from "@/components/protected-media";
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
          <div className="space-y-8">
            {feed.map((item) => (
              <article key={item.id} className="rounded-2xl border border-neutral-800 overflow-hidden">
                <div className="flex items-center justify-between px-5 pt-4 text-xs">
                  <span className="rounded-full border border-amber-500/40 px-2.5 py-0.5 uppercase tracking-wide text-amber-400">{TIER_NAME[item.min_tier] ?? item.min_tier}</span>
                  {!item.live && <span className="text-neutral-500">from the Vault</span>}
                </div>
                <div className="px-5 pt-3">
                  <h2 className="text-xl font-semibold">{item.title}</h2>
                  {item.caption && <p className="mt-1 text-sm text-neutral-400">{item.caption}</p>}
                </div>
                <div className="mt-3 grid gap-1 p-2 sm:grid-cols-2">
                  {item.media.map((m, i) => (
                    <ProtectedMedia key={i} kind={m.kind} url={m.url} alt={item.title} watermark={user.email ?? "members only"} />
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
