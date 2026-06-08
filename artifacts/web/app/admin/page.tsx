import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAdmin } from "@/lib/admin/guard";
import { loadAdminStats, type AccountRow, type StripeSubRow } from "@/lib/admin/stats";
import { WinbackEmails } from "./winback-emails";
import { SlotManager } from "./slot-manager";
import { AdminInbox } from "./inbox";
import { ContentManager } from "./content-manager";
import { isLive } from "@/lib/content/vault";

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
    .limit(500);

  const emailById = new Map(stats.accounts.map((a) => [a.id, a.email]));

  // Load every conversation's messages, then merge by ACCOUNT so each member is
  // a single thread (a member may have multiple conversation rows).
  const perConv = await Promise.all(
    (convs ?? []).map(async (c) => {
      const { data: msgs } = await admin
        .from("chat_messages")
        .select("id, role, content, kind, status, media_kind, locked, price_pence, created_at")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: true })
        .limit(500);
      const all = msgs ?? [];
      const drafts = all.filter((m: any) => m.status === "draft");
      const lastDraft = drafts.length ? drafts[drafts.length - 1] : null;
      const sent = all.filter((m: any) => m.status === "sent");
      const lastAt = all.length ? all[all.length - 1].created_at : c.created_at;
      return { convId: c.id, profileId: c.profile_id, sent, lastDraft, lastAt };
    })
  );

  type Acct = {
    id: string; email: string; messages: any[];
    latestDraftId: string | null; latestDraft: string | null;
    needsReply: boolean; oldestUnansweredAt: string | null; lastActivity: string;
    _draftAt: string | null;
  };
  const byAccount = new Map<string, Acct>();
  for (const o of perConv) {
    const g = byAccount.get(o.profileId) ?? {
      id: o.convId, email: emailById.get(o.profileId) ?? "unknown", messages: [],
      latestDraftId: null, latestDraft: null, needsReply: false,
      oldestUnansweredAt: null, lastActivity: "", _draftAt: null,
    };
    g.messages.push(...o.sent);
    if (o.lastAt > g.lastActivity) { g.lastActivity = o.lastAt; if (!g.latestDraftId) g.id = o.convId; }
    if (o.lastDraft && (!g._draftAt || o.lastDraft.created_at > g._draftAt)) {
      g._draftAt = o.lastDraft.created_at;
      g.latestDraftId = o.lastDraft.id;
      g.latestDraft = o.lastDraft.content;
      g.id = o.convId; // reply must target the conversation that holds the draft
    }
    byAccount.set(o.profileId, g);
  }

  const accounts = Array.from(byAccount.values()).map((g) => {
    g.messages.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
    let lastCreatorIdx = -1;
    g.messages.forEach((m, i) => { if (m.role !== "fan") lastCreatorIdx = i; });
    const trailingFan = g.messages.slice(lastCreatorIdx + 1).filter((m) => m.role === "fan");
    g.oldestUnansweredAt = trailingFan.length ? trailingFan[0].created_at : null;
    g.needsReply = !!g.oldestUnansweredAt || !!g.latestDraft;
    return g;
  });

  // Reply queue: needs a reply, OLDEST waiting first. Everyone else by latest activity.
  const newMessages = accounts
    .filter((a) => a.needsReply)
    .sort((a, b) => String(a.oldestUnansweredAt ?? a.lastActivity).localeCompare(String(b.oldestUnansweredAt ?? b.lastActivity)));
  const allThreads = accounts
    .filter((a) => a.messages.length > 0 || a.latestDraft)
    .sort((a, b) => String(b.lastActivity).localeCompare(String(a.lastActivity)));

  // Booking products, open slots, and upcoming bookings for the slot manager.
  const { data: bookingProducts } = await admin
    .from("products").select("id, name").eq("product_type", "booking").eq("active", true).order("price");
  const { data: openSlotRows } = await admin
    .from("availability_slots")
    .select("id, starts_at, products(name)")
    .eq("status", "open").gt("starts_at", new Date().toISOString()).order("starts_at");
  const openSlots = (openSlotRows ?? []).map((r: any) => ({ id: r.id, starts_at: r.starts_at, product_name: r.products?.name ?? "Session" }));
  const { data: bookingRows } = await admin
    .from("bookings")
    .select("id, scheduled_at, meeting_url, status, products(name), profiles(email)")
    .order("scheduled_at", { ascending: true });
  const upcomingBookings = (bookingRows ?? [])
    .filter((b: any) => b.scheduled_at)
    .map((b: any) => ({ id: b.id, scheduled_at: b.scheduled_at, meeting_url: b.meeting_url, status: b.status, product_name: b.products?.name ?? "Session", email: b.profiles?.email ?? "member" }));

  const { data: contentRows } = await admin
    .from("content_items").select("id, title, min_tier, content_type, published_at")
    .not("published_at", "is", null).order("published_at", { ascending: false }).limit(200);
  const contentItems = (contentRows ?? []).map((c: any) => ({ ...c, live: isLive(c.published_at) }));

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

        {/* Active subscriptions — live from Stripe (source of truth for billing) */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-500">
            Active subscriptions ({stats.stripeSubs.active.length})
          </h2>
          <StripeTable rows={stats.stripeSubs.active} mode="active" />
          {stats.stripeSubs.error && (
            <p className="mt-2 text-xs text-amber-400">Stripe: {stats.stripeSubs.error}</p>
          )}
        </section>

        {/* Cancelled subscribers — winback list */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-500">
            Cancelled subscribers · winback ({stats.stripeSubs.canceled.length})
          </h2>
          <WinbackEmails emails={Array.from(new Set(stats.stripeSubs.canceled.map((r) => r.email).filter((e): e is string => !!e)))} />
          <StripeTable rows={stats.stripeSubs.canceled} mode="canceled" />
        </section>

        {/* All accounts */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-500">
            All accounts ({stats.totalAccounts})
          </h2>
          <Table rows={stats.accounts} />
        </section>

        {/* Bookings & availability */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-500">
            Bookings &amp; availability
          </h2>
          <SlotManager products={bookingProducts ?? []} openSlots={openSlots} bookings={upcomingBookings} />
        </section>

        {/* Content — upload & manage membership content */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-500">Content</h2>
          <ContentManager items={contentItems} />
        </section>

        {/* Messages — review AI drafts, reply, send paid content */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-500">
            Messages
          </h2>
          <AdminInbox newMessages={newMessages} allThreads={allThreads} />
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

function StripeTable({ rows, mode }: { rows: StripeSubRow[]; mode: "active" | "canceled" }) {
  if (rows.length === 0) {
    return <p className="text-sm text-neutral-500">{mode === "active" ? "No active Stripe subscriptions." : "No cancellations yet."}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800">
      <table className="w-full text-sm">
        <thead className="bg-neutral-900 text-left text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">{mode === "active" ? "Renews" : "Cancelled"}</th>
            <th className="px-4 py-3">Since</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {rows.map((r) => (
            <tr key={r.subId} className="hover:bg-neutral-900/50">
              <td className="px-4 py-3">{r.email ?? "—"}</td>
              <td className="px-4 py-3">{r.name ?? "—"}</td>
              <td className="px-4 py-3">{r.product}</td>
              <td className="px-4 py-3 font-medium text-amber-400">{gbp(r.amountGbp)}<span className="text-neutral-500">/{r.interval}</span></td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs ${statusBadge(r.status)}`}>{r.status}</span>
              </td>
              <td className="px-4 py-3">{mode === "active" ? date(r.currentPeriodEnd) : date(r.canceledAt)}</td>
              <td className="px-4 py-3 text-neutral-500">{date(r.created)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
