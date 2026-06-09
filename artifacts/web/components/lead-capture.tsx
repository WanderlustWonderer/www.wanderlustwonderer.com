"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "ww_muse15_seen";
const SEEN_DAYS = 3;
const SUPPRESS = ["/signup", "/login", "/subscribe", "/chat", "/account"];

export function LeadCapture() {
  const [show, setShow] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (SUPPRESS.some((p) => window.location.pathname.startsWith(p))) return;
    // Don't re-nag within SEEN_DAYS.
    const seen = Number(localStorage.getItem(SEEN_KEY) || 0);
    if (seen && Date.now() - seen < SEEN_DAYS * 86400000) return;

    let armed = false;
    let cancelled = false;

    fetch("/api/viewer-status").then((r) => r.json()).then((d) => {
      if (cancelled || d.member) return; // members never see it
      setAuthed(!!d.authed);
      armed = true;
      // Trigger 1: exit intent (mouse leaves toward the top / closing the tab).
      const onLeave = (e: MouseEvent) => { if (armed && e.clientY <= 0) trigger(); };
      document.addEventListener("mouseout", onLeave);
      // Trigger 2: after 30s of browsing, if they haven't engaged.
      const t = setTimeout(() => trigger(), 30000);
      function trigger() { if (!armed) return; armed = false; clearTimeout(t); document.removeEventListener("mouseout", onLeave); setShow(true); }
    }).catch(() => {});

    return () => { cancelled = true; };
  }, []);

  function close() {
    try { localStorage.setItem(SEEN_KEY, String(Date.now())); } catch {}
    setShow(false);
  }
  function claim() {
    try { sessionStorage.setItem("ww_offer", "muse15"); localStorage.setItem(SEEN_KEY, String(Date.now())); } catch {}
    window.location.href = authed ? "/subscribe" : "/signup?next=/subscribe";
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={close}>
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-amber-500/40 bg-neutral-950 p-7 text-center text-neutral-100 shadow-2xl shadow-amber-500/10" onClick={(e) => e.stopPropagation()}>
        <button onClick={close} aria-label="Close" className="absolute right-4 top-4 text-neutral-500 hover:text-neutral-300">✕</button>
        <p className="text-xs uppercase tracking-[0.2em] text-amber-400/90">Before you go ✨</p>
        <h2 className="mt-3 text-2xl font-semibold">15% off your first month</h2>
        <p className="mt-2 text-sm text-neutral-300">
          {authed
            ? "Step behind the veil and save on your first month — your code is applied automatically."
            : "Create your free account and unlock 15% off your first membership. No card needed to look around."}
        </p>
        <div className="mt-4 inline-block rounded-lg border border-dashed border-amber-500/50 bg-amber-500/5 px-4 py-2 text-sm font-mono tracking-widest text-amber-300">
          MUSE15
        </div>
        <button onClick={claim} className="mt-5 block w-full rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-black hover:bg-amber-400">
          {authed ? "Claim my 15% off" : "Create free account & save 15%"}
        </button>
        <button onClick={close} className="mt-3 text-xs text-neutral-500 hover:text-neutral-300">No thanks, I&apos;ll pay full price</button>
      </div>
    </div>
  );
}
