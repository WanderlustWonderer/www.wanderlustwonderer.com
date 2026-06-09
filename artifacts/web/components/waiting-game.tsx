"use client";

import { useState } from "react";

type Phase = "idle" | "playing" | "won" | "lose" | "capped";

export function WaitingGame() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [playsLeft, setPlaysLeft] = useState<number | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function play() {
    if (busy || phase === "capped") return;
    setBusy(true);
    setPhase("playing");
    try {
      const res = await fetch("/api/game/play", { method: "POST" });
      if (res.status === 401) { window.location.href = "/login?next=/account"; return; }
      const d = await res.json();
      // brief suspense before revealing
      await new Promise((r) => setTimeout(r, 1100));
      if (typeof d.balance === "number") setBalance(d.balance);
      if (typeof d.cap === "number" && typeof d.playsToday === "number") setPlaysLeft(Math.max(0, d.cap - d.playsToday));
      if (d.capped) setPhase("capped");
      else setPhase(d.won ? "won" : "lose");
    } catch {
      setPhase("idle");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-indigo-950/40 to-neutral-950 p-6 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-amber-400/90">Catch a falling star ✨</p>
      <h3 className="mt-1 text-lg font-semibold text-neutral-100">Play while you wait</h3>
      <p className="mt-1 text-sm text-neutral-400">Tap the star — 1 in 5 plays wins you a free message with the Muse.</p>

      <div className="relative mx-auto my-5 flex h-28 w-28 items-center justify-center">
        <button
          onClick={play}
          disabled={busy || phase === "capped"}
          aria-label="Play"
          className={`text-6xl transition-transform disabled:opacity-40 ${phase === "playing" ? "animate-ping" : "hover:scale-110 active:scale-95"}`}
        >
          {phase === "won" ? "🌟" : phase === "lose" ? "💫" : phase === "capped" ? "🌙" : "⭐"}
        </button>
      </div>

      <div className="min-h-[2.5rem] text-sm">
        {phase === "idle" && <p className="text-neutral-500">Tap the star to play.</p>}
        {phase === "playing" && <p className="text-amber-300">Catching the magic…</p>}
        {phase === "won" && <p className="font-medium text-emerald-400">✨ You caught it — a free message is yours! Spend it in chat.</p>}
        {phase === "lose" && <p className="text-neutral-400">So close… try again 👀</p>}
        {phase === "capped" && <p className="text-neutral-400">That&apos;s all your plays for today — come back tomorrow ✨</p>}
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-neutral-500">
        {balance !== null && <span>Your messages: <span className="text-amber-400">{balance}</span></span>}
        {playsLeft !== null && phase !== "capped" && <span>{playsLeft} {playsLeft === 1 ? "play" : "plays"} left today</span>}
      </div>

      {(phase === "lose" || phase === "won") && playsLeft !== 0 && (
        <button onClick={play} disabled={busy} className="mt-4 rounded-full bg-amber-500 px-5 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-40">
          Play again
        </button>
      )}
    </div>
  );
}
