import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { syncSubscriptionToProfile, findUserForCustomer } from "@/lib/stripe/sync";
import { PRICE_TO_TIER, tierRank, highestTier } from "@/lib/stripe/tiers";
import { createClient as createMembershipAdmin } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  interpretCheckoutCompleted,
  interpretSubscriptionEvent,
  type WebhookAction,
} from "@/lib/companion/webhook-handlers";
import { tierFromPriceId, creditsFromPriceId } from "@/lib/companion/stripe";
import { applyRenewal, grantPurchase } from "@/lib/wallet/ledger";

export const runtime = "nodejs";

/**
 * Single Stripe webhook for BOTH products on this account:
 *  - Companion platform events (metadata.companion === "1")
 *  - Legacy membership site events (everything else)
 * Idempotency: claim-row pattern on companion_stripe_events.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "not configured" }, { status: 500 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const admin = createAdminClient();

  // --- Idempotency claim: first writer wins, retries no-op. ---
  const { error: claimError } = await admin
    .from("companion_stripe_events")
    .insert({ id: event.id, type: event.type });
  if (claimError) {
    if (claimError.code === "23505") return NextResponse.json({ received: true, duplicate: true });
    return NextResponse.json({ error: "claim failed" }, { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.metadata?.vault === "1") {
          await handleVaultPurchase(session);
        } else if (session.metadata?.content_unlock === "1") {
          await handleContentUnlock(session);
        } else if (session.metadata?.booking_purchase === "1") {
          await handleBookingPurchase(session);
        } else if (session.metadata?.tip === "1") {
          await handleTip(session);
        } else if (session.metadata?.companion === "1") {
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 });
          const credits = creditsFromPriceId(lineItems.data[0]?.price?.id);
          const actions = interpretCheckoutCompleted(
            {
              id: session.id,
              mode: session.mode,
              customer: stringId(session.customer),
              client_reference_id: session.client_reference_id,
              metadata: (session.metadata as Record<string, string>) ?? null,
            },
            event.id,
            credits
          );
          await applyActions(admin, actions);
        } else {
          await handleMembershipCheckout(session);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        if (sub.metadata?.companion === "1") {
          const item = sub.items?.data?.[0];
          const actions = interpretSubscriptionEvent(
            {
              id: sub.id,
              status: sub.status,
              customer: stringId(sub.customer),
              metadata: (sub.metadata as Record<string, string>) ?? null,
              priceId: item?.price?.id ?? null,
              currentPeriodEnd:
                item?.current_period_end ??
                (sub as unknown as { current_period_end?: number }).current_period_end ??
                null,
            },
            tierFromPriceId(item?.price?.id),
            event.type
          );
          await applyActions(admin, actions);
        } else {
          await handleMembershipSubscriptionChange(sub);
        }
        break;
      }
    }
  } catch (err) {
    console.error(`Webhook handler failed for ${event.type}:`, err);
    // Release the claim so Stripe's retry can reprocess.
    await admin.from("companion_stripe_events").delete().eq("id", event.id);
    return NextResponse.json({ error: "handler failure" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function applyActions(
  admin: ReturnType<typeof createAdminClient>,
  actions: WebhookAction[]
) {
  for (const action of actions) {
    switch (action.type) {
      case "set_customer":
        await admin
          .from("companion_profiles")
          .update({ stripe_customer_id: action.stripeCustomerId })
          .eq("id", action.profileId)
          .is("stripe_customer_id", null);
        break;
      case "grant_credits":
        await grantPurchase(admin, action.profileId, action.credits, action.stripeEventId);
        break;
      case "upsert_subscription":
        await admin.from("companion_subscriptions").upsert(
          {
            profile_id: action.profileId,
            stripe_subscription_id: action.stripeSubscriptionId,
            tier: action.tier,
            status: action.status,
            current_period_end: action.currentPeriodEnd,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "stripe_subscription_id" }
        );
        await admin
          .from("companion_profiles")
          .update({ tier: action.tier })
          .eq("id", action.profileId);
        break;
      case "ignore":
        break;
    }
  }
}

// ---------- Legacy membership-site handling (unchanged behaviour) ----------

async function handleMembershipCheckout(session: Stripe.Checkout.Session) {
  if (session.mode === "subscription") {
    const customerId = stringId(session.customer);
    const subscriptionId = stringId(session.subscription);
    if (!customerId || !subscriptionId) return;
    const userId =
      session.client_reference_id ??
      (await findUserForCustomer(customerId, session.customer_details?.email ?? null));
    if (!userId) return;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await syncSubscriptionToProfile(userId, customerId, subscription);
    // Upgrade hygiene: once the new (higher) subscription is live, cancel any
    // of the customer's OTHER active subscriptions on a lower tier so they are
    // never billed twice (also tidies pre-existing duplicate accounts).
    try {
      const newTierRank = tierRank(
        highestTier(subscription.items.data.map((i) => PRICE_TO_TIER[i.price.id])),
      );
      const others = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 100 });
      for (const other of others.data) {
        if (other.id === subscription.id) continue;
        const otherRank = tierRank(highestTier(other.items.data.map((i) => PRICE_TO_TIER[i.price.id])));
        if (otherRank <= newTierRank) {
          await stripe.subscriptions.cancel(other.id);
        }
      }
    } catch (e) {
      console.error("upgrade cleanup failed", e);
    }
  } else if (session.mode === "payment") {
    const supabase = membershipAdmin();
    const customerId = stringId(session.customer);
    const userId =
      session.client_reference_id ??
      (customerId
        ? await findUserForCustomer(customerId, session.customer_details?.email ?? null)
        : null);
    if (!userId) return;

    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
    for (const item of lineItems.data) {
      const priceId = item.price?.id;
      if (!priceId) continue;
      const { data: product } = await supabase
        .from("products")
        .select("id, product_type")
        .eq("stripe_price_id", priceId)
        .maybeSingle();
      if (!product) continue;
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          product_id: product.id,
          stripe_payment_intent_id: stringId(session.payment_intent),
          status: "paid",
        })
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") continue;
        throw error;
      }
      if (product.product_type === "booking") {
        await supabase.from("bookings").insert({
          user_id: userId,
          product_id: product.id,
          order_id: order.id,
          status: "scheduled",
        });
      }
    }
  }
}

async function handleMembershipSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = stringId(subscription.customer);
  if (!customerId) return;
  let email: string | null = null;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (!customer.deleted) email = customer.email;
  } catch {
    /* best effort */
  }
  const userId = await findUserForCustomer(customerId, email);
  if (!userId) return;
  await syncSubscriptionToProfile(userId, customerId, subscription);

  // --- Wallet: monthly credit grants (use-it-or-lose-it) ---
  const admin = createAdminClient();
  const item = subscription.items?.data?.[0];
  const periodEnd =
    item?.current_period_end ??
    (subscription as unknown as { current_period_end?: number }).current_period_end ??
    0;
  const active = subscription.status === "active" || subscription.status === "trialing";
  const tier = item?.price?.id ? (PRICE_TO_TIER[item.price.id] ?? null) : null;
  if (active && tier) {
    // One grant per billing period: idempotency key = subId:periodEnd.
    await applyRenewal(admin, userId, tier, `${subscription.id}:${periodEnd}`);
  } else {
    // Canceled/lapsed: void remaining subscription credits once per period.
    await applyRenewal(admin, userId, null, `${subscription.id}:void:${periodEnd}`);
  }
}

function membershipAdmin() {
  return createMembershipAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

async function handleBookingPurchase(session: Stripe.Checkout.Session) {
  const admin = createAdminClient();
  const productId = session.metadata?.product_id;
  const userId = session.metadata?.user_id ?? session.client_reference_id;
  if (!productId || !userId) return;

  const paymentIntent = stringId(session.payment_intent);

  // Idempotency: dedupe on (payment_intent, product) via the orders unique key.
  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert({
      user_id: userId,
      product_id: productId,
      stripe_payment_intent_id: paymentIntent,
      status: "paid",
    })
    .select("id")
    .single();
  if (orderErr) {
    if (orderErr.code === "23505") return; // already processed
    throw orderErr;
  }

  // Create the UNSCHEDULED booking the member will schedule later.
  await admin.from("bookings").insert({
    user_id: userId,
    product_id: productId,
    order_id: order.id,
    scheduled_at: null,
    status: "unscheduled",
  });
}

async function handleContentUnlock(session: Stripe.Checkout.Session) {
  const admin = createAdminClient();
  const messageId = session.metadata?.message_id;
  const userId = session.metadata?.user_id ?? session.client_reference_id;
  if (!messageId || !userId) return;
  // Unlock only this fan's locked media message; idempotent (already unlocked = no-op).
  await admin
    .from("chat_messages")
    .update({ locked: false, stripe_payment_intent_id: stringId(session.payment_intent) })
    .eq("id", messageId)
    .eq("profile_id", userId)
    .eq("locked", true);
}

async function handleVaultPurchase(session: Stripe.Checkout.Session) {
  const admin = createAdminClient();
  const userId = session.metadata?.user_id ?? session.client_reference_id;
  const scope = session.metadata?.scope;
  if (!userId) return;
  // New per-week purchases: grant one 'week' entitlement per selected week.
  if (scope === "weeks") {
    const keys = String(session.metadata?.week_keys ?? "").split(",").map((k) => Number(k)).filter((k) => Number.isInteger(k));
    for (const k of keys) {
      const { error } = await admin.from("content_entitlements").insert({
        profile_id: userId, scope: "week", period_key: k,
        stripe_payment_intent_id: stringId(session.payment_intent),
      });
      if (error && error.code !== "23505") throw error;
    }
    return;
  }
  if (scope !== "vault_full" && scope !== "block") return;
  const periodKey = scope === "block" ? Number(session.metadata?.period_key) : null;
  // Idempotent via unique (profile_id, scope, period_key).
  const { error } = await admin.from("content_entitlements").insert({
    profile_id: userId, scope, period_key: periodKey,
    stripe_payment_intent_id: stringId(session.payment_intent),
  });
  if (error && error.code !== "23505") throw error;
}

async function handleTip(session: Stripe.Checkout.Session) {
  const admin = membershipAdmin();
  const userId = session.metadata?.user_id ?? session.client_reference_id;
  const paymentIntent = stringId(session.payment_intent);
  if (!userId || !paymentIntent) return;
  // Idempotent on payment_intent (unique index) so webhook retries don't double-record.
  await admin.from("tips").upsert(
    {
      profile_id: userId,
      amount_pence: session.amount_total ?? 0,
      stripe_payment_intent: paymentIntent,
    },
    { onConflict: "stripe_payment_intent", ignoreDuplicates: true },
  );
}

function stringId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}
