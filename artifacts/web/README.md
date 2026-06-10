# Wanderlust Wonderer — web app

Premium 18+ creator subscription + companion-chat platform (single creator: Tasmyn Leigh).

## Stack
- **Next.js 16** (App Router, TypeScript, Tailwind v4)
- **Supabase** — Postgres, Auth (TOTP 2FA), RLS, Storage, pg_cron
- **Stripe** (live) — subscriptions (3 tiers × monthly/3/6/12-month), PPV unlocks, tips, vault, bookings
- **Solana** — optional crypto membership payments
- **Resend** — lifecycle + winback email
- **Sentry** — error monitoring
- **Anthropic (Claude Haiku)** — AI-drafted, human-approved chat replies + Daily Muse

## Local dev
```
npm install
npm run dev      # http://localhost:3000
npm test         # vitest unit tests
npm run lint
```

## Required environment variables
Public (safe to expose): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`NEXT_PUBLIC_APP_URL` (set to the production domain, e.g. https://wanderlustwonderer.com),
`NEXT_PUBLIC_FLASH_END`.

Server-only secrets: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_UPGRADE_COUPON`, `MUSE15_COUPON`, `STRIPE_PRICE_*`, `ANTHROPIC_API_KEY`, `LLM_MODEL`,
`RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `WINBACK_FROM`, `LIFECYCLE_FROM`, `BOOKING_FROM`,
`LIFECYCLE_EMAILS_ENABLED`, `WINBACK_LIVE` (must be "true" to allow live winback sends),
`GOOGLE_SERVICE_ACCOUNT_JSON`, `GDRIVE_FOLDER_ID`, `SOLANA_RPC_URL`,
`ADMIN_EMAILS` (comma-separated admin allowlist — set this explicitly in prod).

## Data model (high level)
Two profile worlds, both keyed on the auth user id:
- `profiles` — membership/billing identity (tier, Stripe ids, subscription_status, founder).
- `companion_profiles` — chat persona/credits side; `credit_ledger`, `conversations`,
  `chat_messages` reference this.

Automation lives in Postgres (pg_cron): `send_due_dms` (welcome DM drip),
`expire_crypto_members`, and the atomic `spend_credit` RPC.

Regenerate DB types after a schema change:
```
supabase gen types typescript --project-id <id> > types/database.ts
```

## Deploy (Replit autoscale)
Push to `main`, then on the Replit box: `git fetch github && git checkout github/main -- artifacts/web`
and Republish. There is no public deploy hook (removed for security). Commit a lockfile and use
`npm ci` for reproducible installs.

> Note: `next.config.ts` currently sets `typescript.ignoreBuildErrors` / `eslint.ignoreDuringBuilds`.
> Run `tsc --noEmit` and `eslint` locally before deploy; flip these to `false` once the type
> pass is clean.
