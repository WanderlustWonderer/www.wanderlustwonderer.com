import type { AccountRow } from "@/lib/admin/stats";
import { isAdmin } from "@/lib/admin/guard";

const TIER_LABEL: Record<string, string> = { the_gallery: "Gallery", private_world: "Private World", all_access: "All Access" };
const NEXT_TIER: Record<string, string> = { the_gallery: "Private World", private_world: "All Access" };

type Tone = "amber" | "emerald" | "red" | "neutral";
type Signal = { email: string; action: string; why: string; priority: number; tone: Tone };

function signalFor(a: AccountRow): Signal | null {
  const active = !!a.subscription_status && ["active", "trialing"].includes(a.subscription_status);
  const tier = a.membership_tier ?? null;
  const msgs = a.messages_sent ?? 0;
  const topups = a.topup_count ?? 0;
  const email = a.email ?? "unknown";

  if (active && tier) {
    if (tier === "all_access") {
      if (topups >= 2 || msgs >= 30)
        return { email, action: "Offer live sessions, the Vault & custom content", why: `Top-tier whale · ${topups} top-ups · ${msgs} msgs`, priority: 110 + topups * 5 + Math.min(msgs, 40), tone: "amber" };
      return null;
    }
    const next = NEXT_TIER[tier];
    if (topups >= 2 || msgs >= 25)
      return { email, action: `Upgrade to ${next}`, why: `Heavy ${TIER_LABEL[tier]} spender · ${topups} top-ups · ${msgs} msgs`, priority: 95 + topups * 5 + Math.min(msgs, 40), tone: "emerald" };
    if (msgs === 0)
      return { email, action: "Re-engage before they churn", why: `${TIER_LABEL[tier]} member, no messages yet`, priority: 45, tone: "red" };
    if (msgs >= 8)
      return { email, action: `Tease the ${next} upgrade`, why: `Engaged ${TIER_LABEL[tier]} member · ${msgs} msgs`, priority: 65 + Math.min(msgs, 30), tone: "emerald" };
    return null;
  }

  if (msgs >= 3)
    return { email, action: "Convert to a membership", why: `Engaged free guest · ${msgs} msgs`, priority: 75 + Math.min(msgs, 30), tone: "emerald" };
  if (msgs >= 1)
    return { email, action: "Nudge first unlock + membership", why: "Free guest, started chatting", priority: 50, tone: "neutral" };
  return null;
}

const TONE: Record<Tone, string> = {
  amber: "border-amber-500/40 bg-amber-500/5",
  emerald: "border-emerald-500/30 bg-emerald-500/5",
  red: "border-red-500/30 bg-red-500/5",
  neutral: "border-neutral-700 bg-neutral-900/60",
};

export function UpsellOpportunities({ accounts }: { accounts: AccountRow[] }) {
  const signals = accounts
    .filter((a) => !isAdmin(a.email))
    .map(signalFor)
    .filter((s): s is Signal => s !== null)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 15);

  if (signals.length === 0) return null;

  return (
    <section className="mt-10">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-widest text-neutral-200">Upsell opportunities</h2>
      <p className="mb-4 text-sm text-neutral-300">Who to sell to next, ranked by signal — based on tier, spend (top-ups) and engagement.</p>
      <div className="space-y-2">
        {signals.map((s, i) => (
          <div key={i} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${TONE[s.tone]}`}>
            <div className="min-w-0">
              <p className="truncate font-medium text-neutral-100">{s.email}</p>
              <p className="text-xs text-neutral-300">{s.why}</p>
            </div>
            <span className="shrink-0 rounded-full border border-neutral-600 px-3 py-1 text-xs font-medium text-neutral-100">{s.action}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
