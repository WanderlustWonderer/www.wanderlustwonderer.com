# Wanderlust Wonderer — Platform

Mystery · Magic · Movement

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router, TypeScript, Tailwind) |
| Backend / DB | Supabase (Postgres, Auth, Realtime, Storage) |
| Payments | Stripe |
| Email | Resend |
| AI Agent | Anthropic Claude API |
| Monitoring | Sentry |

## Structure

```
apps/
  web/               # Next.js application
    src/
      app/           # App Router pages
      components/    # Reusable UI components
      lib/
        supabase/    # Supabase client (browser + server)
        stripe/      # Stripe client + helpers
        ai/          # Claude API + persona prompt
      types/         # Shared TypeScript types
supabase/
  migrations/        # SQL schema migrations
  functions/         # Edge Functions (webhooks, AI draft)
.github/
  workflows/         # CI/CD
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values. Never commit `.env.local`.

## Getting Started

```bash
pnpm install
cd apps/web
pnpm dev
```
