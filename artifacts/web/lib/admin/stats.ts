import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getStripe } from "@/lib/companion/stripe";

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
}

export interface AdminStats {
  accounts: AccountRow[];
  totalAccounts: number;
  activeSubs: AccountRow[];
  stripeSubs: { active: StripeSubRow[]; canceled: StripeSubRow[]; error?: string };
  mrrGbp: number;
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
  const byEmail = new Map<string, StripeSubRow[]>();
  for (const r of out) {
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
  active.sort((a, b) => b.amountGbp - a.amountGbp);
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

  return {
    accounts,
    totalAccounts: accounts.length,
    activeSubs,
    stripeSubs,
    mrrGbp: mrrGbpFinal,
    stripe,
  };
}
