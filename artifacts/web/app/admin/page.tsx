import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAdmin } from "@/lib/admin/guard";
import { loadAdminStats, type AccountRow, type StripeSubRow } from "@/lib/admin/stats";
import { WinbackEmails } from "./winback-emails";
import { WinbackTable } from "./winback-table";
import { WinbackSender } from "./winback-sender";
import { SlotManager } from "./slot-manager";
import { AdminInbox } from "./inbox";
import { ContentManager } from "./content-manager";
import { QueueManager, type QueueItem } from "./queue-manager";
import { VaultWeekTitler, type AdminWeek } from "./vault-week-titler";
import { GdriveImporter } from "./gdrive-importer";
import { listArchiveWeeks } from "@/lib/content/store";
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
  if (!s) return "bg-neutral-800 text-neutral-300";
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

  // Mandatory two-step verification for the admin area.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== "aal2") {
    if (aal?.nextLevel === "aal2") redirect("/mfa?next=/admin"); // has a factor — verify it
    redirect("/account?setup2fa=1"); // no factor — must enrol first
  }

  const admin = createAdminClient();
  const stats = await loadAdminStats(admin);
  const vaultWeeksRaw = await listArchiveWeeks(admin, { tier: null, vaultFull: false, blocks: new Set<number>(), weeks: new Set<number>() });
  const adminVaultWeeks: AdminWeek[] = vaultWeeksRaw.map((w) => ({ weekKey: w.weekKey, title: w.title, rangeLabel: w.rangeLabel, count: w.count, isDefault: w.title.startsWith("Week of ") }));

  // Traffic & funnel — last 7 days from first-party analytics_events.
  const sevenDaysAgo = new Date(Date.now() - 7 * 864e5).toISOString();
  const { data: evRows } = await admin
    .from("analytics_events")
    .select("event, session_id, created_at, props")
    .gte("created_at", sevenDaysAgo)
    .limit(50000);
  const evCounts = new Map<string, number>();
  const sessions = new Set<string>();
  for (const e of evRows ?? []) {
    evCounts.set(e.event, (evCounts.get(e.event) ?? 0) + 1);
    if (e.session_id) sessions.add(e.session_id);
  }
  const funnel = [
    { label: "Visitors (sessions)", value: sessions.size },
    { label: "Page views", value: evCounts.get("page_view") ?? 0 },
    { label: "Signup page views", value: evCounts.get("signup_view") ?? 0 },
    { label: "Subscribe page views", value: evCounts.get("subscribe_view") ?? 0 },
    { label: "Checkouts started", value: (evCounts.get("checkout_started") ?? 0) + (evCounts.get("credits_checkout_started") ?? 0) },
    { label: "Chat messages sent", value: evCounts.get("chat_message_sent") ?? 0 },
    { label: "Age gate entered", value: evCounts.get("age_gate_entered") ?? 0 },
  ];

  // Acquisition: first-touch source per session (from utm/referrer captured at landing).
  const sessionSource = new Map<string, string>();
  for (const e of evRows ?? []) {
    const attr = e.props && typeof e.props === "object" ? (e.props as { attr?: { source?: string; referrer?: string; ref?: string } }).attr : null;
    if (e.session_id && attr) {
      const src = (attr.source || attr.referrer || (attr.ref ? "referral" : "") || "").toString().slice(0, 40);
      if (src && !sessionSource.has(e.session_id)) sessionSource.set(e.session_id, src);
    }
  }
  const sourceCounts = new Map<string, number>();
  for (const src of sessionSource.values()) sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
  const topSources = [...sourceCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const directSessions = Math.max(0, sessions.size - sessionSource.size);

  // Going quiet — members whose last message was >7 days ago (churn risk, prioritise payers).
  const { data: fanMsgs } = await admin.from("chat_messages")
    .select("profile_id, created_at").eq("role", "fan").order("created_at", { ascending: false }).limit(5000);
  const lastFanMsg = new Map<string, string>();
  for (const m of (fanMsgs ?? []) as Array<{ profile_id: string | null; created_at: string }>) {
    if (m.profile_id && !lastFanMsg.has(m.profile_id)) lastFanMsg.set(m.profile_id, m.created_at);
  }
  const quietCutoff = Date.now() - 7 * 864e5;
  const quietIds = [...lastFanMsg.entries()].filter(([, t]) => new Date(t).getTime() < quietCutoff).map(([id]) => id);
  const { data: quietProfilesRaw } = quietIds.length
    ? await admin.from("profiles").select("id, email, subscription_status").in("id", quietIds)
    : { data: [] as Array<{ id: string; email: string | null; subscription_status: string | null }> };
  const quietMembers = ((quietProfilesRaw ?? []) as Array<{ id: string; email: string | null; subscription_status: string | null }>)
    .filter((p) => !isAdmin(p.email))
    .map((p) => ({
      email: p.email ?? "member",
      member: ["active", "trialing"].includes(p.subscription_status ?? ""),
      days: Math.floor((Date.now() - new Date(lastFanMsg.get(p.id)!).getTime()) / 864e5),
    }))
    .sort((a, b) => (b.member ? 1 : 0) - (a.member ? 1 : 0) || b.days - a.days)
    .slice(0, 12);

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
        .select("id, role, content, kind, status, media_kind, locked, price_pence, created_at, read_at")
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
    id: string; profileId: string; email: string; messages: any[];
    latestDraftId: string | null; latestDraft: string | null;
    needsReply: boolean; oldestUnansweredAt: string | null; lastActivity: string;
    _draftAt: string | null;
    queue?: { photoUnlocked: number; videoUnlocked: number; photoRemaining: number; videoRemaining: number };
  };
  const byAccount = new Map<string, Acct>();
  for (const o of perConv) {
    const g = byAccount.get(o.profileId) ?? {
      id: o.convId, profileId: o.profileId, email: emailById.get(o.profileId) ?? "unknown", messages: [],
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

  // ---- Shared content queue: library items, per-item unlock counts, per-fan tallies ----
  const [{ data: queueRows }, { data: queueMsgs }] = await Promise.all([
    admin.from("media_queue").select("id, kind, media_path, price_pence, caption, position").eq("active", true).order("position", { ascending: true }),
    admin.from("chat_messages").select("queue_item_id, profile_id, media_kind, locked").not("queue_item_id", "is", null),
  ]);
  const activePhotoIds = (queueRows ?? []).filter((q: any) => q.kind === "photo").map((q: any) => q.id);
  const activeVideoIds = (queueRows ?? []).filter((q: any) => q.kind === "video").map((q: any) => q.id);
  const unlockByItem = new Map<string, number>();
  const queueByFan = new Map<string, { photoDelivered: Set<string>; videoDelivered: Set<string>; photoUnlocked: number; videoUnlocked: number }>();
  for (const m of queueMsgs ?? []) {
    if (m.locked === false && m.queue_item_id) unlockByItem.set(m.queue_item_id, (unlockByItem.get(m.queue_item_id) ?? 0) + 1);
    const g = queueByFan.get(m.profile_id) ?? { photoDelivered: new Set<string>(), videoDelivered: new Set<string>(), photoUnlocked: 0, videoUnlocked: 0 };
    if (m.media_kind === "photo") { g.photoDelivered.add(m.queue_item_id); if (m.locked === false) g.photoUnlocked++; }
    else if (m.media_kind === "video") { g.videoDelivered.add(m.queue_item_id); if (m.locked === false) g.videoUnlocked++; }
    queueByFan.set(m.profile_id, g);
  }
  for (const a of accounts) {
    const g = queueByFan.get(a.profileId);
    const pd = g?.photoDelivered ?? new Set<string>();
    const vd = g?.videoDelivered ?? new Set<string>();
    a.queue = {
      photoUnlocked: g?.photoUnlocked ?? 0,
      videoUnlocked: g?.videoUnlocked ?? 0,
      photoRemaining: activePhotoIds.filter((id: string) => !pd.has(id)).length,
      videoRemaining: activeVideoIds.filter((id: string) => !vd.has(id)).length,
    };
  }
  const queueItems: QueueItem[] = await Promise.all((queueRows ?? []).map(async (q: any) => {
    let signedUrl: string | null = null;
    if (q.kind === "photo") {
      const { data: sg } = await admin.storage.from("chat-media").createSignedUrl(q.media_path, 600);
      signedUrl = sg?.signedUrl ?? null;
    }
    return { id: q.id, kind: q.kind, price_pence: q.price_pence, caption: q.caption ?? "", position: q.position, signedUrl, unlockedCount: unlockByItem.get(q.id) ?? 0 };
  }));

  // Reply queue: needs a reply, OLDEST waiting first. Everyone else by latest activity.
  const newMessages = accounts
    .filter((a) => a.needsReply)
    .sort((a, b) => String(a.oldestUnansweredAt ?? a.lastActivity).localeCompare(String(b.oldestUnansweredAt ?? b.lastActivity)));
  const allThreads = accounts
    .filter((a) => a.messages.length > 0 || a.latestDraft)
    .sort((a, b) => String(b.lastActivity).localeCompare(String(a.lastActivity)));
  // Emails that already have a conversation — "Send message" loads their thread.
  const chatEmails = Array.from(new Set(accounts.map((a) => (a.email || "").toLowerCase())));

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
          <div className="flex gap-4 text-sm text-neutral-300">
            <Link href="/account" className="hover:text-amber-400">Account</Link>
            <a href="/api/auth/signout" className="hover:text-amber-400">Sign out</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        {/* Earnings */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-200">Earnings</h2>
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

        {/* Revenue by stream — 7-day rolling + 30-day total */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-200">Revenue by stream</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { title: "Messaging upsells", sub: "photo/video unlocks in chat", s7: stats.revenue.upsells7, s30: stats.revenue.upsells30 },
              { title: "Memberships", sub: "recurring subscriptions", s7: stats.revenue.memberships7, s30: stats.revenue.memberships30 },
              { title: "Live sessions", sub: "session bookings", s7: stats.revenue.sessions7, s30: stats.revenue.sessions30 },
            ].map((r) => (
              <div key={r.title} className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
                <p className="text-sm font-medium text-neutral-200">{r.title}</p>
                <p className="text-[11px] text-neutral-300">{r.sub}</p>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-semibold text-amber-400">{gbp(r.s7)}</p>
                    <p className="text-[11px] uppercase tracking-wide text-neutral-300">7-day rolling</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-neutral-200">{gbp(r.s30)}</p>
                    <p className="text-[11px] uppercase tracking-wide text-neutral-300">30-day total</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-300">From Stripe charges. Memberships = subscription invoices; sessions = booking prices; upsells = in-chat unlocks &amp; one-off content.</p>
        </section>

        {/* Top spenders — last 30 days */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-200">Top spenders · last 30 days</h2>
          {stats.topSpenders.length === 0 ? (
            <p className="text-sm text-neutral-300">No charges in the last 30 days yet.</p>
          ) : (
            <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
              {stats.topSpenders.map((t, i) => (
                <li key={t.email ?? i} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                  <span><span className="mr-2 text-neutral-300">#{i + 1}</span>{t.label}{t.email ? <span className="text-neutral-300"> · {t.email}</span> : null}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-neutral-300">{[t.memberships > 0 ? `Memberships ${gbp(t.memberships)}` : null, t.sessions > 0 ? `Sessions ${gbp(t.sessions)}` : null, t.upsells > 0 ? `Upsells ${gbp(t.upsells)}` : null].filter(Boolean).join(" · ")}</span>
                    <span className="font-semibold text-amber-400">{gbp(t.totalGbp)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Traffic & funnel — first-party analytics, last 7 days */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-200">Traffic &amp; funnel · last 7 days</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {funnel.map((f) => (
              <Stat key={f.label} label={f.label} value={String(f.value)} />
            ))}
          </div>
          <p className="mt-2 text-xs text-neutral-300">First-party, cookieless session counting. Numbers build up as visitors arrive.</p>
        </section>

        {/* Acquisition sources — where this week's visitors came from */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-200">Acquisition sources · last 7 days</h2>
          {topSources.length === 0 ? (
            <p className="text-sm text-neutral-300">No tagged sources yet. Add <span className="font-mono text-neutral-300">?utm_source=instagram</span> (etc.) to your ad/post links to see which campaigns drive signups.</p>
          ) : (
            <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
              {topSources.map(([src, n]) => (
                <li key={src} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="text-neutral-200">{src}</span>
                  <span className="text-amber-400">{n} session{n === 1 ? "" : "s"}</span>
                </li>
              ))}
              <li className="flex items-center justify-between px-4 py-2 text-sm text-neutral-300">
                <span>Direct / untagged</span><span>{directSessions} session{directSessions === 1 ? "" : "s"}</span>
              </li>
            </ul>
          )}
        </section>

        {/* Going quiet — re-engage before they churn */}
        <section>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-widest text-neutral-200">Going quiet · re-engage</h2>
          <p className="mb-4 text-xs text-neutral-300">Members who haven&apos;t messaged in 7+ days. Paying members shown first — a warm message often saves them before they cancel.</p>
          {quietMembers.length === 0 ? (
            <p className="text-sm text-neutral-300">No one&apos;s gone quiet — everyone&apos;s engaged ✨</p>
          ) : (
            <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
              {quietMembers.map((q) => (
                <li key={q.email} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span>{q.email}{q.member && <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] text-amber-400">paying</span>}</span>
                  <span className="text-neutral-300">quiet {q.days}d</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Active subscriptions — live from Stripe (source of truth for billing) */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-200">
            Active subscriptions ({stats.stripeSubs.active.length})
          </h2>
          <StripeTable rows={stats.stripeSubs.active} mode="active" chatEmails={chatEmails} />
          {stats.stripeSubs.error && (
            <p className="mt-2 text-xs text-amber-400">Stripe: {stats.stripeSubs.error}</p>
          )}
        </section>

        {/* Cancelled subscribers — winback list */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-200">
            Cancelled subscribers · winback ({stats.stripeSubs.canceled.length})
          </h2>
          <WinbackSender />
          <WinbackEmails emails={Array.from(new Set(stats.stripeSubs.canceled.map((r) => r.email).filter((e): e is string => !!e)))} />
          <WinbackTable rows={stats.stripeSubs.canceled} />
        </section>

        {/* All accounts */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-200">
            All accounts ({stats.totalAccounts})
          </h2>
          <Table rows={stats.accounts} />
        </section>

        {/* Bookings & availability */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-200">
            Bookings &amp; availability
          </h2>
          <SlotManager products={bookingProducts ?? []} openSlots={openSlots} bookings={upcomingBookings} />
        </section>

        {/* Content — upload & manage membership content */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-200">Content</h2>
          <ContentManager items={contentItems} />
        </section>

        {/* Content queue — shared library dripped to fans one at a time */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-200">Content queue</h2>
          <QueueManager items={queueItems} />
        </section>

        {/* Import content straight from Google Drive */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-200">Import from Google Drive</h2>
          <GdriveImporter />
        </section>

        {/* Vault weeks — title each archived week (sold at £150/week in The Vault) */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-200">Vault weeks</h2>
          <VaultWeekTitler weeks={adminVaultWeeks} />
        </section>

        {/* Messages — review drafts, reply, send paid content */}
        <section>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-neutral-200">
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
      <p className="text-xs text-neutral-300">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent ? "text-amber-400" : ""}`}>{value}</p>
    </div>
  );
}

function threadSlug(email: string | null): string { return (email || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"); }

function StripeTable({ rows, mode, chatEmails = [] }: { rows: StripeSubRow[]; mode: "active" | "canceled"; chatEmails?: string[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-neutral-300">{mode === "active" ? "No active Stripe subscriptions." : "No cancellations yet."}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800">
      <table className="w-full text-sm">
        <thead className="bg-neutral-900 text-left text-xs uppercase tracking-wide text-neutral-300">
          <tr>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">{mode === "active" ? "Renews" : "Cancelled"}</th>
            <th className="px-4 py-3">Since</th>
            {mode === "active" && <th className="px-4 py-3"></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-800">
          {rows.map((r) => (
            <tr key={r.subId} className="hover:bg-neutral-900/50">
              <td className="px-4 py-3">{r.email ?? "—"}</td>
              <td className="px-4 py-3">{r.name ?? "—"}</td>
              <td className="px-4 py-3">{r.product}</td>
              <td className="px-4 py-3 font-medium text-amber-400">{gbp(r.amountGbp)}<span className="text-neutral-300">/{r.interval}</span></td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-0.5 text-xs ${statusBadge(r.status)}`}>{r.status}</span>
              </td>
              <td className="px-4 py-3">{mode === "active" ? date(r.currentPeriodEnd) : date(r.canceledAt)}</td>
              <td className="px-4 py-3 text-neutral-300">{date(r.created)}</td>
              {mode === "active" && (
                <td className="px-4 py-3">
                  {chatEmails.includes((r.email || "").toLowerCase()) ? (
                    <a href={`#thread-${threadSlug(r.email)}`} className="rounded-md border border-amber-500/50 px-3 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/10">Send message</a>
                  ) : (
                    <span className="text-xs text-neutral-300">No chat yet</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Table({ rows }: { rows: AccountRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-neutral-300">None.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-800">
      <table className="w-full text-sm">
        <thead className="bg-neutral-900 text-left text-xs uppercase tracking-wide text-neutral-300">
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
              <td className="px-4 py-3 text-neutral-300">{date(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
