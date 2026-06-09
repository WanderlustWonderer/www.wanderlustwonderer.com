import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/companion/stripe";
import { isAdmin } from "@/lib/admin/guard";

const TIER_MONTHLY_GBP: Record<string, number> = {
  the_gallery: 55,
  private_world: 100,
  all_access: 250,
};

export interface AccountRow {
  id: string;
  email: string | null;
  membership_tier: string | null;
  subscription_status: string | null;
  subscription_end_date: string | null;
  created_at: string;
  credit_balance: number;
  messages_sent: number;
  topup_count: number;
}

export interface StripeSubRow {
  subId: string;
  customerId: string;
  email: string | null;
  name: string | null;
  product: string;
  amountGbp: number;
  interval: string;
  status: string;
  currentPeriodEnd: string | null;
  created: string;
  canceledAt: string | null;
  stage?: string;
  notes?: string | null;
  deliveredAt?: string | null;
  openedAt?: string | null;
  clickedAt?: string | null;
  bounced?: boolean;
}

export interface StreamRevenue {
  upsells7: number; upsells30: number;
  memberships7: number; memberships30: number;
  sessions7: number; sessions30: number;
}
export interface TopSpender {
  label: string; email: string | null; totalGbp: number;
  memberships: number; sessions: number; upsells: number;
}

export interface AdminStats {
  accounts: AccountRow[];
  totalAccounts: number;
  activeSubs: AccountRow[];
  stripeSubs: { active: StripeSubRow[]; canceled: StripeSubRow[]; error?: string };
  mrrGbp: number;
  revenue: StreamRevenue;
  topSpenders: TopSpender[];
  stripe: {
    availableGbp: number;
    pendingGbp: number;
    grossLast100Gbp: number;
    chargeCount: number;
    error?: string;
  };
}

async function loadStripeSubscriptions(s: ReturnType<typeof getStripe>): Promise<{ active: StripeSubRow[]; canceled: StripeSubRow[]; mrrGbp: number }> {
  const out: StripeSubRow[] = [];
  let startingAfter: string | undefined;
  // Paginate so every subscription (active + canceled) is captured.
  for (let i = 0; i < 20; i++) {
    const res: any = await s.subscriptions.list({
      status: "all",
      limit: 100,
      expand: ["data.customer"],
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    for (const sub of res.data as any[]) {
      const cust = sub.customer && typeof sub.customer === "object" ? sub.customer : null;
      const item = sub.items?.data?.[0];
      const price = item?.price;
      const periodEnd = item?.current_period_end ?? sub.current_period_end ?? null;
      out.push({
        subId: sub.id,
        customerId: typeof sub.customer === "string" ? sub.customer : cust?.id ?? "",
        email: cust?.email ?? null,
        name: cust?.name ?? null,
        product: sub.description ?? price?.nickname ?? "Subscription",
        amountGbp: (price?.unit_amount ?? 0) / 100,
        interval: price?.recurring?.interval ?? "month",
        status: sub.status,
        currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        created: new Date(sub.created * 1000).toISOString(),
        canceledAt: sub.canceled_at
          ? new Date(sub.canceled_at * 1000).toISOString()
          : sub.ended_at
          ? new Date(sub.ended_at * 1000).toISOString()
          : null,
      });
    }
    if (!res.has_more || res.data.length === 0) break;
    startingAfter = res.data[res.data.length - 1].id;
  }

  // Consolidate by person (email). Members often sign up to one tier then
  // upgrade, leaving several subscription rows; we want ONE row per person.
  const isActive = (st: string) => ["active", "trialing", "past_due"].includes(st);
  const visible = out.filter((r) => !isAdmin(r.email)); // hide owner/test accounts
  const byEmail = new Map<string, StripeSubRow[]>();
  for (const r of visible) {
    const key = (r.email || r.customerId || r.subId).toLowerCase();
    const arr = byEmail.get(key) ?? [];
    arr.push(r);
    byEmail.set(key, arr);
  }

  const active: StripeSubRow[] = [];
  const canceled: StripeSubRow[] = [];
  for (const subs of byEmail.values()) {
    const actives = subs.filter((r) => isActive(r.status));
    if (actives.length) {
      // Current customer: show their highest active plan only.
      active.push([...actives].sort((a, b) => b.amountGbp - a.amountGbp)[0]);
    } else {
      // Fully churned: one winback row = highest plan they ever held,
      // stamped with their most recent cancellation and earliest signup.
      const rep = { ...[...subs].sort((a, b) => b.amountGbp - a.amountGbp)[0] };
      rep.canceledAt = subs.map((r) => r.canceledAt).filter(Boolean).sort().pop() ?? rep.canceledAt;
      rep.created = subs.map((r) => r.created).filter(Boolean).sort()[0] ?? rep.created;
      canceled.push(rep);
    }
  }
  active.sort((a, b) => String(a.currentPeriodEnd ?? "9999-12-31").localeCompare(String(b.currentPeriodEnd ?? "9999-12-31")));
  canceled.sort((a, b) => String(b.canceledAt ?? "").localeCompare(String(a.canceledAt ?? "")));
  const mrrGbp = active
    .filter((r) => ["active", "trialing"].includes(r.status))
    .reduce((sum, r) => sum + (r.interval === "year" ? r.amountGbp / 12 : r.amountGbp), 0);
  return { active, canceled, mrrGbp };
}

export async function loadAdminStats(admin: SupabaseClient): Promise<AdminStats> {
  const { data: rows } = await admin
    .from("admin_account_overview")
    .select("*")
    .order("created_at", { ascending: false });
  const accounts = (rows ?? []) as AccountRow[];

  const activeSubs = accounts.filter(
    (a) => a.subscription_status && ["active", "trialing"].includes(a.subscription_status)
  );
  const mrrGbp = activeSubs.reduce(
    (sum, a) => sum + (a.membership_tier ? TIER_MONTHLY_GBP[a.membership_tier] ?? 0 : 0),
    0
  );

  let mrrGbpFinal = mrrGbp;
  const stripeSubs: { active: StripeSubRow[]; canceled: StripeSubRow[]; error?: string } = {
    active: [],
    canceled: [],
  };

  const stripe = {
    availableGbp: 0,
    pendingGbp: 0,
    grossLast100Gbp: 0,
    chargeCount: 0,
    error: undefined as string | undefined,
  };
  try {
    const s = getStripe();
    try {
      const subs = await loadStripeSubscriptions(s);
      stripeSubs.active = subs.active;
      stripeSubs.canceled = subs.canceled;
      if (subs.active.length > 0) mrrGbpFinal = subs.mrrGbp;
      const { data: wb } = await admin.from("winback_targets").select("email, stage, notes, delivered_at, opened_at, clicked_at, bounced");
      const wbByEmail = new Map((wb ?? []).map((r: { email: string; stage: string; notes: string | null }) => [r.email.toLowerCase(), r]));
      stripeSubs.canceled = stripeSubs.canceled.map((r) => {
        const w = wbByEmail.get((r.email || "").toLowerCase()) as Record<string, unknown> | undefined;
        return {
          ...r,
          stage: (w?.stage as string) ?? "not_started",
          notes: (w?.notes as string) ?? null,
          deliveredAt: (w?.delivered_at as string) ?? null,
          openedAt: (w?.opened_at as string) ?? null,
          clickedAt: (w?.clicked_at as string) ?? null,
          bounced: (w?.bounced as boolean) ?? false,
        };
      });
    } catch (e) {
      stripeSubs.error = e instanceof Error ? e.message : "Stripe subscriptions unavailable";
    }
    const balance = await s.balance.retrieve();
    stripe.availableGbp =
      (balance.available.find((b) => b.currency === "gbp")?.amount ?? 0) / 100;
    stripe.pendingGbp =
      (balance.pending.find((b) => b.currency === "gbp")?.amount ?? 0) / 100;
    const charges = await s.charges.list({ limit: 100 });
    const succeeded = charges.data.filter((c) => c.paid && c.status === "succeeded");
    stripe.chargeCount = succeeded.length;
    stripe.grossLast100Gbp =
      succeeded
        .filter((c) => c.currency === "gbp")
        .reduce((sum, c) => sum + c.amount, 0) / 100;
  } catch (err) {
    stripe.error = err instanceof Error ? err.message : "Stripe unavailable";
  }

  // --- Revenue by stream (7d rolling + 30d total) + top spenders ---
  const rev: Record<string, number> = { upsells7: 0, upsells30: 0, memberships7: 0, memberships30: 0, sessions7: 0, sessions30: 0 };
  const spend = new Map<string, TopSpender>();
  const SESSION_PENCE = new Set([33300, 55500, 222200]);
  try {
    const s3 = getStripe();
    const now = Math.floor(Date.now() / 1000);
    const since30 = now - 30 * 86400;
    const since7 = now - 7 * 86400;
    let after: string | undefined;
    for (let i = 0; i < 6; i++) {
      const res: any = await s3.charges.list({ limit: 100, created: { gte: since30 }, expand: ["data.invoice"], ...(after ? { starting_after: after } : {}) });
      for (const c of res.data as any[]) {
        if (!c.paid || c.status !== "succeeded" || c.currency !== "gbp") continue;
        const amt = c.amount / 100;
        const email: string | null = c.billing_details?.email ?? c.receipt_email ?? null;
        if (isAdmin(email)) continue;
        const cat = c.invoice ? "memberships" : (SESSION_PENCE.has(c.amount) ? "sessions" : "upsells");
        rev[cat + "30"] += amt;
        if (c.created >= since7) rev[cat + "7"] += amt;
        const key = (email || (typeof c.customer === "string" ? c.customer : "") || c.id).toLowerCase();
        const name = c.billing_details?.name || email || "Member";
        const cur = spend.get(key) ?? { label: name, email, totalGbp: 0, memberships: 0, sessions: 0, upsells: 0 };
        cur.totalGbp += amt;
        (cur as any)[cat] += amt;
        if (!cur.email && email) cur.email = email;
        spend.set(key, cur);
      }
      if (!res.has_more || res.data.length === 0) break;
      after = res.data[res.data.length - 1].id;
    }
  } catch { /* breakdown best-effort */ }
  const revenue: StreamRevenue = {
    upsells7: rev.upsells7, upsells30: rev.upsells30,
    memberships7: rev.memberships7, memberships30: rev.memberships30,
    sessions7: rev.sessions7, sessions30: rev.sessions30,
  };
  const topSpenders = [...spend.values()].sort((a, b) => b.totalGbp - a.totalGbp).slice(0, 8);

  return {
    accounts,
    totalAccounts: accounts.length,
    activeSubs,
    stripeSubs,
    mrrGbp: mrrGbpFinal,
    revenue,
    topSpenders,
    stripe,
  };
}
