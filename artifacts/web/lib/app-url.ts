/**
 * Base URL for building absolute redirect URLs (Stripe success/cancel, billing
 * portal returns, etc). Prefers NEXT_PUBLIC_APP_URL, but ignores it when it
 * points at localhost/127.0.0.1 (a stale dev value) and falls back to the
 * actual request origin so production never redirects to a dev server.
 */
export function getAppUrl(req: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env && !/localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(env)) {
    return env.replace(/\/+$/, "");
  }
  return new URL(req.url).origin;
}
