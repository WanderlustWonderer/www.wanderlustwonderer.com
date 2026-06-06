---
name: Next.js 16 in pnpm monorepo
description: Two breaking quirks when running Next.js 16 inside a pnpm workspace under artifacts/web
---

## Quirk 1 — Turbopack can't resolve `next` through pnpm symlinks

**Rule:** Add `public-hoist-pattern[]=next` to the **root** `.npmrc`, then run `CI=true pnpm install` to hoist `next` to the workspace root's `node_modules`.

**Why:** Turbopack traverses up from `app/` to find the pnpm workspace root (via `pnpm-workspace.yaml`). It then tries to resolve `next/package.json` from there. pnpm only installs `next` inside `artifacts/web/node_modules` as a symlink into the content-addressable store; Turbopack's security sandbox refuses to follow symlinks outside the project path. Hoisting puts a real copy at the workspace root where Turbopack can find it.

**How to apply:** Any time a new Next.js app is added to this monorepo under `artifacts/`, add its key packages to `public-hoist-pattern[]` in the root `.npmrc` and reinstall with `CI=true`.

---

## Quirk 2 — `middleware.ts` is deprecated; use `proxy.ts`

**Rule:** In Next.js 16, the file must be named `proxy.ts` (or `.js`/`.mjs`) and the exported function must be named `proxy`, not `middleware`.

**Why:** Next.js 16 renamed the middleware convention to "proxy". Using `middleware.ts` still works but logs a deprecation warning per request, flooding the console.

**How to apply:** When creating or migrating a Next.js 16 app, use `proxy.ts` with `export async function proxy(request: NextRequest) { ... }` from the start.
