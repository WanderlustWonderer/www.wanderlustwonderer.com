import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Page not found", robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <div className="text-neutral-100 min-h-screen">
      <SiteNav />
      <main className="mx-auto flex max-w-2xl flex-col items-center justify-center px-6 py-32 text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-3xl text-black">✦</div>
        <h1 className="font-display text-4xl font-semibold">This path leads nowhere</h1>
        <p className="mt-3 max-w-sm text-sm text-neutral-400">The page you're looking for has drifted out of orbit. Let's get you back.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-primary">Return home</Link>
          <Link href="/subscribe" className="btn-ghost">Become a member</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
