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

export function track(event: string, props?: Record<string, unknown>) {
  try {
    const body = JSON.stringify({ event, path: location.pathname, sessionId: sessionId(), props });
    if (navigator.sendBeacon) navigator.sendBeacon("/api/track", new Blob([body], { type: "application/json" }));
    else fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true });
  } catch { /* ignore */ }
}

export function Analytics() {
  const pathname = usePathname();
  useEffect(() => {
    // Map a few key pages to their own funnel events too.
    track("page_view");
    if (pathname === "/signup") track("signup_view");
    if (pathname === "/subscribe") track("subscribe_view");
    if (typeof window !== "undefined") (window as unknown as { wwTrack?: typeof track }).wwTrack = track;
  }, [pathname]);
  return null;
}
