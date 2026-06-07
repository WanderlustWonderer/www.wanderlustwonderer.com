/**
 * Pure webhook interpreters — no IO, fully unit-testable.
 * The route verifies signatures, claims idempotency, then applies the
 * actions these functions return.
 */
import type { TierKey } from "@/config/creator";

export type WebhookAction =
  | {
      type: "grant_credits";
      profileId: string;
      credits: number;
      reason: string;
      stripeEventId: string;
    }
  | {
      type: "upsert_subscription";
      profileId: string;
      stripeSubscriptionId: string;
      tier: TierKey;
      status: string;
      currentPeriodEnd: string | null;
    }
  | { type: "set_customer"; profileId: string; stripeCustomerId: string }
  | { type: "ignore"; detail: string };

export interface CheckoutSessionLike {
  id: string;
  mode: string | null;
  customer: string | null;
  client_reference_id: string | null;
  metadata: Record<string, string> | null;
}

export interface SubscriptionLike {
  id: string;
  status: string;
  customer: string | null;
  metadata: Record<string, string> | null;
  priceId: string | null;
  currentPeriodEnd: number | null; // unix seconds
}

export function interpretCheckoutCompleted(
  session: CheckoutSessionLike,
  eventId: string,
  creditsForPrice: number | null
): WebhookAction[] {
  const profileId = session.metadata?.profile_id ?? session.client_reference_id;
  if (session.metadata?.companion !== "1" || !profileId) {
    return [{ type: "ignore", detail: "not a companion checkout" }];
  }

  const actions: WebhookAction[] = [];
  if (session.customer) {
    actions.push({ type: "set_customer", profileId, stripeCustomerId: session.customer });
  }
  if (session.mode === "payment") {
    if (!creditsForPrice) return [{ type: "ignore", detail: "unknown credit pack price" }];
    actions.push({
      type: "grant_credits",
      profileId,
      credits: creditsForPrice,
      reason: "credit_purchase",
      stripeEventId: eventId,
    });
  }
  // mode === "subscription": tier is applied by the subscription.created event.
  return actions.length ? actions : [{ type: "ignore", detail: "nothing to do" }];
}

export function interpretSubscriptionEvent(
  sub: SubscriptionLike,
  tierForPrice: TierKey | null,
  eventType: string
): WebhookAction[] {
  const profileId = sub.metadata?.profile_id;
  if (sub.metadata?.companion !== "1" || !profileId) {
    return [{ type: "ignore", detail: "not a companion subscription" }];
  }
  const deleted = eventType === "customer.subscription.deleted";
  const active = !deleted && (sub.status === "active" || sub.status === "trialing");
  const tier: TierKey = active ? (tierForPrice ?? "fan") : "free";

  return [
    {
      type: "upsert_subscription",
      profileId,
      stripeSubscriptionId: sub.id,
      tier,
      status: deleted ? "canceled" : sub.status,
      currentPeriodEnd: sub.currentPeriodEnd
        ? new Date(sub.currentPeriodEnd * 1000).toISOString()
        : null,
    },
  ];
}
