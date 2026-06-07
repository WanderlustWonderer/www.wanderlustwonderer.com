import { describe, expect, it } from "vitest";
import {
  interpretCheckoutCompleted,
  interpretSubscriptionEvent,
} from "@/lib/companion/webhook-handlers";

const baseSession = {
  id: "cs_1",
  mode: "payment",
  customer: "cus_1",
  client_reference_id: "user-1",
  metadata: { companion: "1", profile_id: "user-1" },
};

describe("interpretCheckoutCompleted", () => {
  it("ignores non-companion checkouts", () => {
    const actions = interpretCheckoutCompleted({ ...baseSession, metadata: {} }, "evt_1", 50);
    expect(actions).toEqual([{ type: "ignore", detail: "not a companion checkout" }]);
  });

  it("grants credits for payment mode with known pack", () => {
    const actions = interpretCheckoutCompleted(baseSession, "evt_1", 50);
    expect(actions).toContainEqual({
      type: "grant_credits",
      profileId: "user-1",
      credits: 50,
      reason: "credit_purchase",
      stripeEventId: "evt_1",
    });
    expect(actions).toContainEqual({
      type: "set_customer",
      profileId: "user-1",
      stripeCustomerId: "cus_1",
    });
  });

  it("ignores unknown credit pack prices", () => {
    const actions = interpretCheckoutCompleted(baseSession, "evt_1", null);
    expect(actions).toEqual([{ type: "ignore", detail: "unknown credit pack price" }]);
  });

  it("subscription mode defers tier to subscription events", () => {
    const actions = interpretCheckoutCompleted(
      { ...baseSession, mode: "subscription" },
      "evt_1",
      null
    );
    expect(actions.every((a) => a.type !== "grant_credits")).toBe(true);
  });
});

const baseSub = {
  id: "sub_1",
  status: "active",
  customer: "cus_1",
  metadata: { companion: "1", profile_id: "user-1" },
  priceId: "price_vip",
  currentPeriodEnd: 1800000000,
};

describe("interpretSubscriptionEvent", () => {
  it("ignores non-companion subscriptions", () => {
    const actions = interpretSubscriptionEvent(
      { ...baseSub, metadata: {} },
      "vip",
      "customer.subscription.created"
    );
    expect(actions[0].type).toBe("ignore");
  });

  it("applies tier on active subscription", () => {
    const [action] = interpretSubscriptionEvent(baseSub, "vip", "customer.subscription.created");
    expect(action).toMatchObject({ type: "upsert_subscription", tier: "vip", status: "active" });
  });

  it("downgrades to free on deletion", () => {
    const [action] = interpretSubscriptionEvent(baseSub, "vip", "customer.subscription.deleted");
    expect(action).toMatchObject({ type: "upsert_subscription", tier: "free", status: "canceled" });
  });

  it("downgrades to free when status is not active", () => {
    const [action] = interpretSubscriptionEvent(
      { ...baseSub, status: "unpaid" },
      "vip",
      "customer.subscription.updated"
    );
    expect(action).toMatchObject({ tier: "free", status: "unpaid" });
  });

  it("converts period end to ISO", () => {
    const [action] = interpretSubscriptionEvent(baseSub, "vip", "customer.subscription.updated");
    if (action.type === "upsert_subscription") {
      expect(action.currentPeriodEnd).toBe(new Date(1800000000 * 1000).toISOString());
    } else {
      throw new Error("wrong action type");
    }
  });
});
