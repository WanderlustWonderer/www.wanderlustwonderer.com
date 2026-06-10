const NEXT: Record<string, { label: string; perk: string }> = {
  the_gallery: { label: "Private World", perk: "the private sanctuary, deeper access and more of me" },
  private_world: { label: "All Access", perk: "the full unfiltered story and VIP status" },
};

export function LoyaltyStatus({ isMember, tier }: { isMember: boolean; tier: string | null }) {
  if (!isMember || !tier) {
    return (
      <section className="mt-10 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-8 text-center">
        <h2 className="font-display text-2xl text-amber-200">Become a member, unlock VIP status</h2>
        <p className="mt-2 text-sm text-neutral-300">Members earn status, perks and priority — and the higher you go, the closer you get to me.</p>
        <a href="/subscribe" className="mt-4 inline-block rounded-full bg-amber-500 px-6 py-2.5 text-sm font-medium text-black transition hover:bg-amber-400">See the tiers</a>
      </section>
    );
  }
  const isTop = tier === "all_access";
  const next = NEXT[tier];
  return (
    <section className="mt-10 rounded-2xl border border-neutral-700 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl">Your status</h2>
          <p className="mt-1 text-sm text-neutral-300">
            {isTop ? "✨ VIP · All Access — you're at the very top. Priority replies and first access to every drop." : `You're a ${tier === "private_world" ? "Private World" : "Gallery"} member.`}
          </p>
        </div>
        <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
          {isTop ? "VIP" : "Member"}
        </span>
      </div>
      {next && (
        <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <p className="text-sm text-amber-200">Upgrade to <span className="font-semibold">{next.label}</span> for {next.perk}.</p>
          <a href="/subscribe" className="mt-3 inline-block rounded-full bg-amber-500 px-5 py-2 text-sm font-medium text-black transition hover:bg-amber-400">Upgrade now</a>
        </div>
      )}
    </section>
  );
}
