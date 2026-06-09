import Link from "next/link";

/**
 * Public teaser wall — blurred, locked placeholder tiles that create curiosity
 * without exposing any real member content, driving free signups.
 */
const TILES = [
  { tag: "The Gallery", grad: "from-violet-500/40 to-fuchsia-500/30" },
  { tag: "Private World", grad: "from-indigo-500/40 to-violet-600/30" },
  { tag: "All Access", grad: "from-amber-400/30 to-rose-500/30" },
  { tag: "The Vault", grad: "from-cyan-400/30 to-indigo-500/30" },
  { tag: "Private World", grad: "from-fuchsia-500/30 to-violet-500/30" },
  { tag: "The Gallery", grad: "from-rose-400/30 to-amber-400/30" },
];

export function TeaserWall() {
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-5xl px-6 py-20 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-400">A glimpse behind the veil</p>
        <h2 className="font-display mt-3 text-3xl font-semibold">What's waiting inside</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-mute">
          New drops every week across three tiers. Create a free account to step through the portal — no card required.
        </p>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {TILES.map((t, i) => (
            <div key={i} className="group relative aspect-[3/4] overflow-hidden rounded-2xl border border-white/10">
              <div className={`absolute inset-0 bg-gradient-to-br ${t.grad}`} style={{ filter: "blur(6px)" }} />
              <div className="absolute inset-0 bg-[#0a0826]/40" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <span className="text-2xl">🔒</span>
                <span className="rounded-full border border-white/20 bg-black/30 px-3 py-1 text-[10px] uppercase tracking-wider text-neutral-200">{t.tag}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="btn-primary">Create free account</Link>
          <Link href="/subscribe" className="btn-ghost">See membership tiers</Link>
        </div>
      </div>
    </section>
  );
}
