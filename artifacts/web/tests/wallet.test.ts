import { describe, expect, it } from "vitest";
import { pickSpendPot, monthlyGrantAmount, planRenewalEntries } from "@/lib/wallet/grants";

describe("pickSpendPot", () => {
  it("spends subscription pot first", () => {
    expect(pickSpendPot({ subscription: 2, purchased: 5 })).toBe("subscription");
  });
  it("falls back to purchased", () => {
    expect(pickSpendPot({ subscription: 0, purchased: 5 })).toBe("purchased");
  });
  it("returns null when broke", () => {
    expect(pickSpendPot({ subscription: 0, purchased: 0 })).toBe(null);
  });
  it("never spends a negative pot", () => {
    expect(pickSpendPot({ subscription: -1, purchased: 1 })).toBe("purchased");
  });
});

describe("monthlyGrantAmount", () => {
  it("maps tiers to 5/8/15", () => {
    expect(monthlyGrantAmount("the_gallery")).toBe(5);
    expect(monthlyGrantAmount("private_world")).toBe(8);
    expect(monthlyGrantAmount("all_access")).toBe(15);
  });
  it("unknown or no tier grants nothing", () => {
    expect(monthlyGrantAmount(null)).toBe(0);
    expect(monthlyGrantAmount("inner")).toBe(0);
  });
});

describe("planRenewalEntries", () => {
  it("voids leftovers then grants fresh credits", () => {
    expect(planRenewalEntries("all_access", 4, "sub_1:170")).toEqual([
      { reason: "monthly_void", delta: -4, pot: "subscription", stripe_event_id: "sub_1:170" },
      { reason: "monthly_grant", delta: 15, pot: "subscription", stripe_event_id: "sub_1:170" },
    ]);
  });
  it("skips void when nothing left", () => {
    expect(planRenewalEntries("the_gallery", 0, "k")).toEqual([
      { reason: "monthly_grant", delta: 5, pot: "subscription", stripe_event_id: "k" },
    ]);
  });
  it("cancel = void only", () => {
    expect(planRenewalEntries(null, 3, "k")).toEqual([
      { reason: "monthly_void", delta: -3, pot: "subscription", stripe_event_id: "k" },
    ]);
  });
  it("cancel with empty pot = no entries", () => {
    expect(planRenewalEntries(null, 0, "k")).toEqual([]);
  });
});
