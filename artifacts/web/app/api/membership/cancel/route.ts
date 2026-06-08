import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { TIER_PRICE_IDS, tierRank, type MembershipTier } from "@/lib/stripe/tiers";

export const runtime = "nodejs";

type Action = "discount" | "downgrade" | "cancel";

/** Ensure a fixed-id coupon exists; create it once, reuse forever. */
async function ensureCoupon(id: string, params: Record<string, unknown>) {
  try {
    await stripe.coupons.retrieve(id);
  } catch {
    try { await stripe.coupons.create({ id, ...(params as never) }); } catch { /* race: created elsewhere */ }
  }
  return id;
}

/**
 * POST { action, toTier? } — member self-service billing actions.
 * Save offers (discount / freemonth / downgrade) keep the subscription alive;
 * "cancel" schedules cancellation at period end so they keep access until then.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  let body: { action?: Action; toTier?: MembershipTier };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const action = body.action;
  if (!action) return NextResponse.json({ error: "missing_action" }, { status: 400 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id, stripe_subscription_id, membership_tier, subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  const isActive = !!profile?.subscription_status && ["active", "trialing"].includes(profile.subscription_status as string);
  if (!isActive) return NextResponse.json({ error: "not_active" }, { status: 409 });

  // Resolve the subscription id (stored, else look up by customer).
  let subId = profile?.stripe_subscription_id ?? null;
  if (!subId && profile?.stripe_customer_id) {
    const subs = await stripe.subscriptions.list({ customer: profile.stripe_customer_id, status: "all", limit: 10 });
    const live = subs.data.find((s) => ["active", "trialing", "past_due"].includes(s.status));
    subId = live?.id ?? null;
  }
  if (!subId) return NextResponse.json({ error: "no_stripe_subscription" }, { status: 409 });

  if (action === "discount") {
    const coupon = await ensureCoupon("RETAIN25_3MO", { name: "Loyalty 25% (3 months)", percent_off: 25, duration: "repeating", duration_in_months: 3 });
    await stripe.subscriptions.update(subId, { discounts: [{ coupon }] } as never);
    return NextResponse.json({ ok: true, message: "25% off your next 3 months is locked in 💛" });
  }

  if (action === "downgrade") {
    const toTier = body.toTier;
    const current = (profile?.membership_tier as MembershipTier | null) ?? null;
    if (!toTier || !TIER_PRICE_IDS[toTier]) return NextResponse.json({ error: "invalid_tier" }, { status: 400 });
    if (tierRank(toTier) >= tierRank(current)) return NextResponse.json({ error: "not_a_downgrade" }, { status: 400 });
    const sub = await stripe.subscriptions.retrieve(subId);
    const itemId = sub.items.data[0]?.id;
    if (!itemId) return NextResponse.json({ error: "no_item" }, { status: 500 });
    await stripe.subscriptions.update(subId, {
      items: [{ id: itemId, price: TIER_PRICE_IDS[toTier] }],
      proration_behavior: "none",
      cancel_at_period_end: false,
    });
    await admin.from("profiles").update({ membership_tier: toTier }).eq("id", user.id);
    return NextResponse.json({ ok: true, message: "Your plan has been switched — you keep access, at a lower price." });
  }

  if (action === "cancel") {
    const sub = await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
    const endsAt = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
    return NextResponse.json({ ok: true, endsAt, message: "Your membership will end at the close of your current period. You keep full access until then." });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
