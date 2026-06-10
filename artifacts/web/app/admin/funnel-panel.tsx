import { createAdminClient } from "@/utils/supabase/admin";

function pct(n: number, d: number): string {
  if (!d) return "—";
  return `${Math.round((n / d) * 1000) / 10}%`;
}

export async function FunnelPanel() {
  const admin = createAdminClient();
  const since = new Date(Date.now() - 30 * 864e5).toISOString();

  const [evs, signups, activated, purchasers, subscribers] = await Promise.all([
    admin.from("analytics_events").select("session_id", { count: "exact", head: false }).gte("created_at", since).limit(20000),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", since),
    admin.from("chat_messages").select("profile_id").eq("role", "fan").gte("created_at", since).limit(20000),
    admin.from("credit_ledger").select("profile_id").gte("created_at", since).gt("delta", 0).neq("reason", "migration_bonus").limit(20000),
    admin.from("profiles").select("id", { count: "exact", head: true }).in("subscription_status", ["active", "trialing"]),
  ]);

  const visitors = new Set((evs.data ?? []).map((e: any) => e.session_id).filter(Boolean)).size;
  const signupN = signups.count ?? 0;
  const activeN = new Set((activated.data ?? []).map((a: any) => a.profile_id)).size;
  const buyerN = new Set((purchasers.data ?? []).map((p: any) => p.profile_id)).size;
  const subN = subscribers.count ?? 0;

  const steps = [
    { label: "Visitors", value: visitors, of: null as number | null },
    { label: "Signed up", value: signupN, of: visitors },
    { label: "Sent a message", value: activeN, of: signupN },
    { label: "Made a purchase", value: buyerN, of: activeN },
    { label: "Subscribed (current)", value: subN, of: null },
  ];

  return (
    <section className="mt-10">
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-widest text-neutral-200">Conversion funnel · last 30 days</h2>
      <p className="mb-4 text-sm text-neutral-300">Where visitors turn into payers. Watch the drop-offs during the launch.</p>
      <div className="grid gap-3 sm:grid-cols-5">
        {steps.map((s, i) => (
          <div key={s.label} className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
            <p className="text-[11px] uppercase tracking-wide text-neutral-300">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold text-neutral-100">{s.value}</p>
            {s.of !== null && <p className="mt-1 text-xs text-amber-400">{pct(s.value, s.of)} of prev</p>}
            {i === 0 && <p className="mt-1 text-xs text-neutral-500">unique sessions</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
