import { describe, expect, it } from "vitest";
import { decideEntitlement, dailyLimit, memoryDepth } from "@/lib/companion/entitlements";

describe("decideEntitlement", () => {
  it("uses daily allowance first for subscribers", () => {
    const d = decideEntitlement({ tier: "fan", usedToday: 0, creditBalance: 5 });
    expect(d).toEqual({ allow: true, via: "allowance", remainingAllowance: 24 });
  });

  it("counts the last allowance message correctly", () => {
    const d = decideEntitlement({ tier: "fan", usedToday: 24, creditBalance: 0 });
    expect(d).toEqual({ allow: true, via: "allowance", remainingAllowance: 0 });
  });

  it("falls back to credits when allowance exhausted", () => {
    const d = decideEntitlement({ tier: "fan", usedToday: 25, creditBalance: 3 });
    expect(d).toEqual({ allow: true, via: "credit", creditBalanceAfter: 2 });
  });

  it("free users spend credits (no allowance)", () => {
    const d = decideEntitlement({ tier: "free", usedToday: 0, creditBalance: 10 });
    expect(d).toEqual({ allow: true, via: "credit", creditBalanceAfter: 9 });
  });

  it("denies free users with subscribe_or_topup", () => {
    const d = decideEntitlement({ tier: "free", usedToday: 0, creditBalance: 0 });
    expect(d).toEqual({ allow: false, reason: "subscribe_or_topup" });
  });

  it("denies exhausted subscribers with topup", () => {
    const d = decideEntitlement({ tier: "vip", usedToday: 100, creditBalance: 0 });
    expect(d).toEqual({ allow: false, reason: "topup" });
  });

  it("tier limits match config", () => {
    expect(dailyLimit("free")).toBe(0);
    expect(dailyLimit("fan")).toBe(25);
    expect(dailyLimit("vip")).toBe(100);
    expect(dailyLimit("inner")).toBe(250);
  });

  it("memory depth grows with tier", () => {
    expect(memoryDepth("free")).toBeLessThan(memoryDepth("fan"));
    expect(memoryDepth("fan")).toBeLessThan(memoryDepth("vip"));
    expect(memoryDepth("vip")).toBeLessThan(memoryDepth("inner"));
  });
});
