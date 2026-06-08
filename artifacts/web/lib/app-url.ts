/**
 * Public base URL for building absolute redirect URLs (Stripe success/cancel,
 * billing portal returns, auth redirects, etc).
 *
 * On Replit Autoscale the Next.js server binds internally to localhost:3000, so
 * `new URL(req.url).origin` yields "http://localhost:3000" — which breaks any
 * redirect built from it. The reliable source of the real public domain is the
 * forwarded host header set by the proxy. Order of preference:
 *   1. x-forwarded-host / host header (handles the live domain AND custom domains)
 *   2. NEXT_PUBLIC_APP_URL env (if set and not localhost)
 *   3. request origin (last resort)
 */
export function getAppUrl(req: Request): string {
  const bad = /localhost|127\.0\.0\.1|0\.0\.0\.0/i;

  const fwdHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (fwdHost && !bad.test(fwdHost)) {
    const proto = req.headers.get("x-forwarded-proto") || "https";
    return `${proto}://${fwdHost}`.replace(/\/+$/, "");
  }

  const env = process.env.NEXT_PUBLIC_APP_URL;
  if (env && !bad.test(env)) return env.replace(/\/+$/, "");

  try {
    return new URL(req.url).origin;
  } catch {
    return "";
  }
}

/** Absolute URL on the app's public origin for a given path. */
export function appRedirectUrl(req: Request, path: string): string {
  const base = getAppUrl(req);
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
