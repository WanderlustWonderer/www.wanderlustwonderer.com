import Link from "next/link";
import { ContentList } from "../content-list";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";

export default async function AllAccessPage() {
  return (
    <div className="bg-black text-neutral-100 min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-semibold tracking-tight">All Access</h1>
          <p className="mt-3 opacity-70">Nothing held back.</p>
          <nav className="mt-6 flex justify-center gap-4 text-sm">
            <Link href="/portal" className="hover:text-amber-500">The Gallery</Link>
            <Link href="/portal/private-world" className="hover:text-amber-500">Private World</Link>
            <span className="text-amber-500">All Access</span>
          </nav>
        </header>
        <ContentList tier="all_access" />
      </main>
      <SiteFooter />
    </div>
  );
}
