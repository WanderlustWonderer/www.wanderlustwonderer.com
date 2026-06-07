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

export interface AdminStats {
  accounts: AccountRow[];
  totalAccounts: number;
  activeSubs: AccountRow[];
  mrrGbp: number;
  stripe: {
    availableGbp: number;
    pendingGbp: number;
    grossLast100Gbp: number;
    chargeCount: number;
    error?: string;
  };
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

  const stripe = {
    availableGbp: 0,
    pendingGbp: 0,
    grossLast100Gbp: 0,
    chargeCount: 0,
    error: undefined as string | undefined,
  };
  try {
    const s = getStripe();
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
    mrrGbp,
    stripe,
  };
}
