import Link from "next/link";

const LINKS = [
  { href: "/muse", label: "THE MUSE" },
  { href: "/subscribe", label: "THE PORTAL" },
  { href: "/collection", label: "THE COLLECTION" },
  { href: "/book", label: "BOOK" },
  { href: "/practice", label: "THE PRACTICE" },
  { href: "/tribute", label: "THE TRIBUTE" },
];

export function SiteNav() {
  return (
    <header className="border-b border-white/10 bg-[#0a0826]/50 backdrop-blur-md text-neutral-100">
      <div className="mx-auto max-w-6xl px-6 py-8 text-center">
        <Link href="/" className="font-wordmark text-4xl font-semibold tracking-[0.2em] uppercase">
          Wanderlust Wonderer
        </Link>
        <p className="mt-2 text-sm tracking-[0.35em] uppercase text-amber-400/90">
          Mystery | Magic | Movement
        </p>
        <nav className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs tracking-[0.25em]">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-amber-400 transition">
              {l.label}
            </Link>
          ))}
          <Link href="/account" className="text-neutral-500 hover:text-amber-400 transition">
            ACCOUNT
          </Link>
        </nav>
      </div>
    </header>
  );
}
