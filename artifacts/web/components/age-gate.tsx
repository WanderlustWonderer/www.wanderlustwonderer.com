"use client";

import { useEffect, useState } from "react";
import { track } from "@/components/analytics";

/**
 * 18+ interstitial. Renders nothing on the server and on first client paint
 * (so it never blocks SEO/crawlers or causes hydration mismatch), then shows
 * the gate after hydration if the visitor hasn't confirmed before.
 */
export function AgeGate() {
  const [confirmed, setConfirmed] = useState(true);

  useEffect(() => {
    try { setConfirmed(localStorage.getItem("ww_age_ok") === "1"); }
    catch { setConfirmed(true); }
  }, []);

  if (confirmed) return null;

  function enter() {
    try { localStorage.setItem("ww_age_ok", "1"); } catch { /* ignore */ }
    track("age_gate_entered");
    setConfirmed(true);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050418]/95 backdrop-blur-md px-6">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0e0a30]/80 p-8 text-center text-neutral-100 shadow-2xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-2xl text-black">✦</div>
        <h2 className="font-display text-2xl font-semibold">Are you 18 or older?</h2>
        <p className="mt-3 text-sm text-neutral-400">
          This is an adult members club. By entering you confirm you are at least 18 years old
          (or the age of majority where you live) and that adult content is lawful for you to view.
        </p>
        <div className="mt-7 flex flex-col gap-3">
          <button onClick={enter} className="rounded-full bg-gradient-to-r from-amber-300 to-amber-500 px-6 py-3 text-sm font-semibold text-black hover:opacity-90">
            I am 18 or older — Enter
          </button>
          <a href="https://www.google.com" className="text-xs text-neutral-500 underline hover:text-neutral-300">
            I am under 18 — Leave
          </a>
        </div>
      </div>
    </div>
  );
}
