import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAdmin } from "@/lib/admin/guard";
import { loadAdminStats, type AccountRow } from "@/lib/admin/stats";

export const dynamic = "force-dynamic";

const TIER_NAME: Record<string, string> = {
  the_gallery: "Gallery",
  private_world: "Private World",
  all_access: "All Access",
};

function gbp(n: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n);
}
function date(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function statusBadge(s: string | null): string {
  if (!s) return "bg-neutral-800 text-neutral-400";
  if (["active", "trialing"].includes(s)) return "bg-emerald-500/15 text-emerald-400";
  if (["past_due", "unpaid", "incomplete"].includes(s)) return "bg-amber-500/15 text-amber-400";
  return "bg-red-500/15 text-red-400";
}

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) notFound(); // 404 for everyone who isn't an admin

  const admin = createAdminClient();
  const stats = await loadAdminStats(admin);

  // Recent conversations with fan email + last message
  const { data: convs } = await admin
    .from("conversations")
    .select("id, profile_id, created_at")
    .order("created_at", { ascending: false })
    .limit(15);

  const emailById = new Map(stats.accounts.map((a) => [a.id, a.email]));
  const conversations = await Promise.all(
    (convs ?? []).map(async (c) => {
      const { data: msgs } = await admin
        .from("chat_messages")
        .select("role, content, created_at")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: true })
        .limit(100);
      return { id: c.id, email: emailById.get(c.profile_id) ?? "unknown", messages: msgs ?? [] };
    })
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 bg-black">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-lg font-semibold tracking-wide">Admin · Wanderlust Wonderer</h1>
          <div className="flex gap-4 text-sm text-neutral-400">
            <Link href="/account" className="hover:text-amber-400">Account</Link>
            <a href="/api/auth/signout" className="hover:text-amber-400">Sign out</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        {/* Earnings */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-500">Earnings</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="MRR (active subs)" value={gbp(stats.mrrGbp)} accent />
            <Stat label="Stripe available" value={gbp(stats.stripe.availableGbp)} />
            <Stat label="Stripe pending" value={gbp(stats.stripe.pendingGbp)} />
            <Stat label={`Gross · last ${stats.stripe.chargeCount} charges`} value={gbp(stats.stripe.grossLast100Gbp)} />
          </div>
          {stats.stripe.error && (
            <p className="mt-2 text-xs text-amber-400">Stripe: {stats.stripe.error}</p>
          )}
        </section>

        {/* Active subscriptions */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-500">
            Active subscriptions ({stats.activeSubs.length})
          </h2>
          <Table rows={stats.activeSubs} />
        </section>

        {/* All accounts */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-500">
            All accounts ({stats.totalAccounts})
          </h2>
          <Table rows={stats.accounts} />
        </section>

        {/* Conversations */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-500">
            Recent conversations
          </h2>
          {conversations.length === 0 && <p className="text-sm text-neutral-500">No conversations yet.</p>}
          <div className="space-y-3">
            {conversations.map((c) => (
              <details key={c.id} className="rounded-xl border border-neutral-800 bg-neutral-900">
                <summary className="cursor-pointer px-4 py-3 text-sm">
                  <span className="font-medium">{c.email}</span>
                  <span className="ml-3 text-neutral-500">{c.messages.length} messages</span>
                </summary>
                <div className="space-y-2 border-t border-neutral-800 px-4 py-3">
                  {c.messages.map((m, i) => (
                    <div key={i} className={m.role === "fan" ? "text-right" : "text-left"}>
                      <span className={`inline-block max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.role === "fan" ? "bg-amber-500/20" : "bg-neutral-800"}`}>
                        {m.content}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? "border-amber-500/40 bg-amber-500/5" : "border-neutral-800 bg-neutral-900"}`}>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent ? "text-amber-400" : ""}`}>{value}</p>
    </div>
  );
}

function Table({ rows }: { rows: AccountRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-neutral-500">None.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800">
      <table className="w-full text-sm">
        <thead className="bg-neutral-900 text-left text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Tier</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Credits</th>
            <th className="px-4 py-3">Msgs</th>
            <th className="px-4 py-3">Top-ups</th>
            <th className="px-4 py-3">Renews</th>
            <th className="px-4 py-3">Joined</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-neutral-900/50">
              <td className="px-4 py-3">{r.email ?? "—"}</td>
              <td className="px-4 py-3">{r.membership_tier ? (TIER_NAME[r.membership_tier] ?? r.membership_tier) : "Guest"}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs ${statusBadge(r.subscription_status)}`}>
                  {r.subscription_status ?? "guest"}
                </span>
              </td>
              <td className="px-4 py-3 font-medium text-amber-400">{r.credit_balance}</td>
              <td className="px-4 py-3">{r.messages_sent}</td>
              <td className="px-4 py-3">{r.topup_count}</td>
              <td className="px-4 py-3">{date(r.subscription_end_date)}</td>
              <td className="px-4 py-3 text-neutral-500">{date(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
