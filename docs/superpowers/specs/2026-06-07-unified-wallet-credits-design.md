# Unified Wallet & Credits — Design Spec

Date: 2026-06-07
Status: Approved by owner (Liam)
Scope: Project 1 of 2 (Project 2 = live booking calendar, separate spec)

## Summary

One account per person. Every account has a wallet of chat credits. Chat costs
1 credit per message (max 250 characters). Credits come from a one-time signup
bonus, monthly subscription grants (use-it-or-lose-it), and unlimited paid
top-ups. The account hub shows subscription, balance, history, top-up, and chat.

## Decisions (locked)

| Topic | Decision |
|---|---|
| Subscription system | Muse tiers only (GBP). Companion $-tiers, daily allowances, $-packs retired. |
| Chat access | Everyone with an account; credits are the only meter. |
| Message cost | 1 credit per message, enforced server-side. |
| Message length | 250 characters max, enforced client + server. |
| Signup bonus | +3 credits, once per account, never expire. |
| Monthly grants | Gallery 5, Private World 8, All Access 15 — per successful billing cycle. |
| Grant expiry | Use-it-or-lose-it: unused subscription credits voided at next renewal/cancel. |
| Top-up pricing | £5 = 1 credit; £88 = 20 credits. No purchase limits. Never expire. |
| Spend order | Subscription pot first, then purchased pot. |
| Refunds | AI failure auto-refunds +1 to the pot it came from; message removed. |

## Architecture (Approach 1: tagged append-only ledger)

Extend existing `credit_ledger` table:

- New column: `pot text NOT NULL DEFAULT 'purchased' CHECK (pot IN ('subscription','purchased'))`
- Balance per pot = `SUM(delta) WHERE profile_id = X AND pot = Y`
- User-visible balance = sum of both pots
- All rows immutable; no balance columns anywhere.

### Ledger entry vocabulary

| reason | delta | pot |
|---|---|---|
| `signup_bonus` | +3 | purchased |
| `monthly_grant` | +5 / +8 / +15 | subscription |
| `monthly_void` | −(remaining sub balance) | subscription |
| `credit_purchase` | +1 / +20 | purchased |
| `message` | −1 | (pot it was spent from) |
| `auto_refund` | +1 | (same pot as the failed spend) |

`stripe_event_id` populated on webhook-driven rows for idempotency/audit.

## Components

1. **`lib/wallet/ledger.ts`** — pure + IO helpers: `balances(profileId)` → {subscription, purchased, total}; `spendCredit(profileId)` → picks pot (subscription first), inserts −1, returns pot used or `insufficient`; `refundCredit(profileId, pot)`.
2. **`lib/wallet/grants.ts`** — `applyMonthlyGrant(profileId, tier)`: in one transaction, insert `monthly_void` (if remaining sub balance > 0) then `monthly_grant` (+5/8/15). `voidSubscriptionPot(profileId)` for cancel/downgrade.
3. **Stripe webhook (existing route)** — on membership `checkout.session.completed` / `invoice.paid` (renewals) for Muse tiers → `applyMonthlyGrant`; on `customer.subscription.deleted` → `voidSubscriptionPot`. On credit-pack checkout → `credit_purchase` grant. Claim-row idempotency (existing `companion_stripe_events`).
4. **Chat API (existing `/api/chat`)** — replace allowance logic: validate length ≤ 250 → `spendCredit` → 402 `{reason:"topup"}` if insufficient → LLM call → on failure `refundCredit` + delete message.
5. **Account hub `/account`** — subscription card (tier, renewal date, manage/billing-portal), wallet card (total balance, top-up buttons £5/£88), history list (rendered from ledger, newest first, human labels), chat entry point.
6. **Top-up checkout** — `/api/checkout` extended with `kind:"credits"` mapped to two new GBP Stripe prices (`STRIPE_PRICE_CREDIT_SINGLE` £5, `STRIPE_PRICE_CREDIT_PACK20` £88).
7. **Signup** — existing lazy profile creation grants +3 (`signup_bonus`, purchased pot) exactly once (guarded by existing idempotent profile creation).

## Stripe objects (to create)

- Product "Chat Credit" price £5 one-off (GBP) → `STRIPE_PRICE_CREDIT_SINGLE`
- Product "Chat Credits ×20" price £88 one-off (GBP) → `STRIPE_PRICE_CREDIT_PACK20`
- Archive: companion $ tiers (Fan/VIP/Inner) and $ credit packs.

## Retired

- `lib/companion/entitlements.ts` daily-allowance logic (tier limits, memoryDepth stays for prompt history).
- Companion $-tier checkout paths and `companion_subscriptions` tier gating for chat (table remains for history).
- Old packs in `config/creator.ts` replaced by GBP packs.

## Error handling

- Webhook void+grant pairs execute atomically (single SQL transaction via RPC or sequential inserts guarded by event idempotency — retried events no-op via claim row).
- Spend/refund always reference the same pot; refund of an expired-pot spend still refunds to that pot (acceptable: net zero).
- 402 responses distinguish nothing — everyone's remedy is top-up (subscribe upsell shown to guests in UI copy only).
- Length violations: 400, no spend.

## Testing

- Unit: pot ordering, balance math, void-then-grant on renewal, no-double-grant on retried webhook event, refund-to-same-pot, 250-char rejection, signup bonus idempotency.
- Update existing entitlement/webhook tests to the credits-only model.
- Manual: full journey — signup → 3 credits → chat ×3 → 402 → top-up £5 → chat → subscribe All Access → +15 → renewal void/grant (Stripe test clock or manual SQL).

## Out of scope (Project 2)

Live booking calendar for time-slot products (availability management, slot
locking, purchase flow) — separate spec.
