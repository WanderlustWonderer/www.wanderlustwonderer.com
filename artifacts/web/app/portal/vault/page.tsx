import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getViewerEntitlements, listArchiveBlocks } from "@/lib/content/store";
import { VaultClient } from "./vault-client";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";

export default async function VaultPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/portal/vault");
  const admin = createAdminClient();
  const ent = await getViewerEntitlements(admin, user.id);
  const blocks = await listArchiveBlocks(admin, ent);

  return (
    <div className="bg-black text-neutral-100 min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-14">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">The Vault</h1>
          <p className="mt-2 opacity-70">Everything beyond the last 4 weeks — all of it, forever.</p>
          <Link href="/portal" className="mt-4 inline-block text-sm text-amber-400 hover:text-amber-300">← Back to The Portal</Link>
        </header>
        <VaultClient blocks={blocks} vaultFull={ent.vaultFull} />
      </main>
      <SiteFooter />
    </div>
  );
}
