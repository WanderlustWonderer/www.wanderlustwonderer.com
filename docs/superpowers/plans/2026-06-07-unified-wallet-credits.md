# Unified Wallet & Credits Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dual-currency chat model with one credits-only wallet per account: 3 signup credits, monthly tier grants (5/8/15, use-it-or-lose-it), GBP top-ups (£5×1, £88×20), 1 credit per ≤250-char message.

**Architecture:** Tagged append-only ledger (`credit_ledger.pot` = subscription|purchased). Balance = SUM(delta) per pot; spend subscription pot first. Stripe webhook voids+grants on membership renewal (idempotent via `stripe_event_id = subId:periodEnd`), grants purchases. Chat API spends/refunds via a small wallet lib.

**Tech Stack:** Next.js 16 (artifacts/web), Supabase (Postgres, untyped client), Stripe, vitest (run externally — Replit firewall blocks it in deploys).

---

### Task 1: DB migration — pot column

**Files:** Supabase project `ztmcljadywpsxwgkmliq` (MCP `apply_migration`)

- [ ] **Step 1: Apply migration**

```sql
ALTER TABLE public.credit_ledger
  ADD COLUMN pot text NOT NULL DEFAULT 'purchased'
  CHECK (pot IN ('subscription','purchased'));
CREATE INDEX idx_credit_ledger_profile_pot ON public.credit_ledger(profile_id, pot);
```

- [ ] **Step 2: Verify** — `list_tables` shows `pot` on `credit_ledger`.

### Task 2: Stripe — GBP credit prices, archive $ products

- [ ] **Step 1:** Create product "Chat Credit" + price £5 (500 gbp, one-off) → note id as `STRIPE_PRICE_CREDIT_SINGLE`.
- [ ] **Step 2:** Create product "Chat Credits ×20" + price £88 (8800 gbp) → `STRIPE_PRICE_CREDIT_PACK20`.
- [ ] **Step 3:** Archive products `Wanderlust AI — Fan/VIP/Inner Circle`, `50/250 Credits` and deactivate their prices (PostProductsId / PostPricesPrice, active=false).

### Task 3: Wallet library

**Files:** Create `artifacts/web/lib/wallet/ledger.ts`, `artifacts/web/lib/wallet/grants.ts`; Test `artifacts/web/tests/wallet.test.ts`

- [ ] **Step 1: Failing tests** (pure logic: pot pick + grant interpreter)

```ts
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
});

describe("monthlyGrantAmount", () => {
  it("maps tiers", () => {
    expect(monthlyGrantAmount("the_gallery")).toBe(5);
    expect(monthlyGrantAmount("private_world")).toBe(8);
    expect(monthlyGrantAmount("all_access")).toBe(15);
    expect(monthlyGrantAmount(null)).toBe(0);
  });
});

describe("planRenewalEntries", () => {
  it("voids leftovers then grants", () => {
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
});
```

- [ ] **Step 2:** Run externally (vitest sandbox) — expect FAIL (module missing).
- [ ] **Step 3: Implement `grants.ts`** (pure)

```ts
export type Pot = "subscription" | "purchased";
export interface PotBalances { subscription: number; purchased: number; }
export interface LedgerEntryPlan { reason: string; delta: number; pot: Pot; stripe_event_id: string; }

const GRANTS: Record<string, number> = { the_gallery: 5, private_world: 8, all_access: 15 };

export function monthlyGrantAmount(tier: string | null | undefined): number {
  return tier ? (GRANTS[tier] ?? 0) : 0;
}

export function pickSpendPot(b: PotBalances): Pot | null {
  if (b.subscription > 0) return "subscription";
  if (b.purchased > 0) return "purchased";
  return null;
}

export function planRenewalEntries(tier: string | null, remainingSub: number, idemKey: string): LedgerEntryPlan[] {
  const entries: LedgerEntryPlan[] = [];
  if (remainingSub > 0) entries.push({ reason: "monthly_void", delta: -remainingSub, pot: "subscription", stripe_event_id: idemKey });
  const grant = monthlyGrantAmount(tier);
  if (grant > 0) entries.push({ reason: "monthly_grant", delta: grant, pot: "subscription", stripe_event_id: idemKey });
  return entries;
}
```

- [ ] **Step 4: Implement `ledger.ts`** (IO)

```ts
import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { pickSpendPot, planRenewalEntries, type Pot, type PotBalances } from "./grants";

export async function balances(admin: SupabaseClient, profileId: string): Promise<PotBalances & { total: number }> {
  const { data } = await admin.from("credit_ledger").select("delta, pot").eq("profile_id", profileId);
  const b: PotBalances = { subscription: 0, purchased: 0 };
  for (const row of data ?? []) b[(row.pot as Pot) ?? "purchased"] += row.delta;
  return { ...b, total: b.subscription + b.purchased };
}

export async function spendCredit(admin: SupabaseClient, profileId: string): Promise<Pot | null> {
  const pot = pickSpendPot(await balances(admin, profileId));
  if (!pot) return null;
  const { error } = await admin.from("credit_ledger").insert({ profile_id: profileId, delta: -1, reason: "message", pot });
  if (error) throw error;
  return pot;
}

export async function refundCredit(admin: SupabaseClient, profileId: string, pot: Pot): Promise<void> {
  await admin.from("credit_ledger").insert({ profile_id: profileId, delta: 1, reason: "auto_refund", pot });
}

export async function applyRenewal(admin: SupabaseClient, profileId: string, tier: string | null, idemKey: string): Promise<void> {
  const { data: existing } = await admin.from("credit_ledger").select("id").eq("stripe_event_id", idemKey).limit(1);
  if (existing && existing.length > 0) return; // already granted for this period
  const b = await balances(admin, profileId);
  const rows = planRenewalEntries(tier, Math.max(0, b.subscription), idemKey).map((e) => ({ ...e, profile_id: profileId }));
  if (rows.length) {
    const { error } = await admin.from("credit_ledger").insert(rows);
    if (error) throw error;
  }
}

export async function grantPurchase(admin: SupabaseClient, profileId: string, credits: number, eventId: string): Promise<void> {
  await admin.from("credit_ledger").insert({ profile_id: profileId, delta: credits, reason: "credit_purchase", pot: "purchased", stripe_event_id: eventId });
}
```

- [ ] **Step 5:** Tests pass. **Step 6:** Commit `feat(wallet): tagged-pot ledger library`.

### Task 4: Config — GBP packs, signup bonus 3

**Files:** Modify `artifacts/web/config/creator.ts`, `artifacts/web/lib/companion/profile.ts`

- [ ] **Step 1:** In `config/creator.ts`: `SIGNUP_BONUS_CREDITS = 3`; replace `CREDIT_PACKS` with:

```ts
export interface CreditPack { key: "single" | "pack20"; credits: number; priceLabel: string; priceEnv: string; }
export const CREDIT_PACKS: CreditPack[] = [
  { key: "single", credits: 1, priceLabel: "£5", priceEnv: "STRIPE_PRICE_CREDIT_SINGLE" },
  { key: "pack20", credits: 20, priceLabel: "£88", priceEnv: "STRIPE_PRICE_CREDIT_PACK20" },
];
```

Keep `TIERS` only if still referenced; remove `dailyMessages` usage (memory depth becomes constant 40 in prompt.ts: `export const MEMORY_DEPTH = 40`).
- [ ] **Step 2:** `profile.ts` signup insert gains `pot: "purchased"`. Commit.

### Task 5: Chat API — credits only, 250 cap

**Files:** Modify `artifacts/web/app/api/chat/route.ts`, `artifacts/web/lib/companion/prompt.ts`

- [ ] **Step 1:** Length guard `message.length > 250` → 400 `{error:"too_long", max:250}`.
- [ ] **Step 2:** Replace allowance/entitlement block with `spendCredit`; if null → 402 `{error:"payment_required", reason:"topup"}`. Spend BEFORE persisting fan message; on LLM failure call `refundCredit(admin, user.id, pot)` and delete the fan message row. `selectHistory(messages)` uses constant depth 40. Response: `{reply, conversationId, balance: total-after}`.
- [ ] **Step 3:** ChatView: `maxLength={250}` + char counter `n/250`; paywall modal single variant ("Top up credits", link `/account`). Commit.

### Task 6: Webhook — membership grants + GBP packs

**Files:** Modify `artifacts/web/app/api/stripe/webhook/route.ts`, `artifacts/web/lib/companion/stripe.ts`

- [ ] **Step 1:** `creditsFromPriceId` reads new envs (single→1, pack20→20).
- [ ] **Step 2:** In `handleMembershipSubscriptionChange` after `syncSubscriptionToProfile`: resolve profileId (existing `findUserForCustomer`), tier from price map; if status active/trialing → `applyRenewal(admin, userId, tier, `${sub.id}:${currentPeriodEnd}`)`; if deleted/inactive → `applyRenewal(admin, userId, null, `${sub.id}:void:${Date.now()}` )` — idemKey for void-on-cancel uses subId:void:periodEnd (stable), NOT Date.now().
- [ ] **Step 3:** Companion `grant_credits` action path now writes pot purchased via `grantPurchase`. Membership one-off product purchases (Collection) untouched.
- [ ] **Step 4:** Update `tests/webhook-handlers.test.ts` expectations (credits 1/20). Commit.

### Task 7: Account hub + top-ups

**Files:** Rewrite `artifacts/web/app/account/page.tsx`; Modify `artifacts/web/app/api/checkout/route.ts`, `artifacts/web/app/pricing/page.tsx`

- [ ] **Step 1:** `/api/checkout` `kind:"credits"` keys `single|pack20`; success_url `/account?topup=success`.
- [ ] **Step 2:** Account page sections: (a) subscription card — tier name, renewal date, "Manage billing" → `/api/stripe/portal`, or "Become a member" → `/subscribe`; (b) wallet card — big total from `balances()`, sub-pot note "N expire at renewal", two `CheckoutButton`s (£5, £88); (c) history — last 50 ledger rows, labels: signup_bonus→"Welcome credits", monthly_grant→"Monthly membership credits", monthly_void→"Expired with renewal", credit_purchase→"Top-up", message→"Message sent", auto_refund→"Refund"; (d) "Open chat" button.
- [ ] **Step 3:** Pricing page: replace $-tiers with GBP packs + link to /subscribe for memberships. Commit.

### Task 8: Tests green + ship

- [ ] Run vitest externally (sandbox dir pattern): all wallet + prompt + webhook tests pass.
- [ ] esbuild syntax check all touched files.
- [ ] Push to GitHub; owner pulls in Replit; add 2 new secrets; republish.
