"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

function sessionId(): string {
  try {
    let s = localStorage.getItem("ww_sid");
    if (!s) { s = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("ww_sid", s); }
    return s;
  } catch { return "anon"; }
}

/** First-touch acquisition attribution (utm + referrer), stored once and attached to events. */
function captureAttribution() {
  try {
    const url = new URL(location.href);
    const p = url.searchParams;
    // Referral code → cookie so it survives the signup hop (read server-side on /account).
    const ref = p.get("ref");
    if (ref) document.cookie = `ww_ref=${encodeURIComponent(ref.slice(0, 32))}; path=/; max-age=7776000; SameSite=Lax`;
    // First-touch UTM — don't overwrite once set.
    if (!localStorage.getItem("ww_attr")) {
      const utm = {
        source: p.get("utm_source") || "",
        medium: p.get("utm_medium") || "",
        campaign: p.get("utm_campaign") || "",
        ref: ref || "",
        referrer: document.referrer ? new URL(document.referrer).hostname : "",
      };
      if (utm.source || utm.medium || utm.campaign || utm.ref || utm.referrer) {
        localStorage.setItem("ww_attr", JSON.stringify(utm));
      }
    }
  } catch { /* ignore */ }
}

function attribution(): Record<string, unknown> | undefined {
  try { const a = localStorage.getItem("ww_attr"); return a ? JSON.parse(a) : undefined; } catch { return undefined; }
}

export function track(event: string, props?: Record<string, unknown>) {
  try {
    const attr = attribution();
    const merged = attr ? { ...(props ?? {}), attr } : props;
    const body = JSON.stringify({ event, path: location.pathname, sessionId: sessionId(), props: merged });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
  } catch { /* ignore */ }
}

export function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    captureAttribution();
    track("page_view");
    if (pathname === "/signup") track("signup_view");
    if (pathname === "/subscribe") track("subscribe_view");
    if (typeof window !== "undefined") (window as unknown as { wwTrack?: typeof track }).wwTrack = track;
  }, [pathname]);
  return null;
}
