import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe/client";
import { syncSubscriptionToProfile, findUserForCustomer } from "@/lib/stripe/sync";
import { createClient as createMembershipAdmin } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  interpretCheckoutCompleted,
  interpretSubscriptionEvent,
  type WebhookAction,
} from "@/lib/companion/webhook-handlers";
import { tierFromPriceId, creditsFromPriceId } from "@/lib/companion/stripe";

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
        if (session.metadata?.companion === "1") {
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
        await admin.from("credit_ledger").insert({
          profile_id: action.profileId,
          delta: action.credits,
          reason: action.reason,
          stripe_event_id: action.stripeEventId,
        });
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
}

function membershipAdmin() {
  return createMembershipAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_ROLE_KEY as string,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

function stringId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}
