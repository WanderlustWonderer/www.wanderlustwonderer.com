"use client";
import { useEffect, useState } from "react";

const END = process.env.NEXT_PUBLIC_FLASH_END || "2026-06-15T22:00:00Z";

export function FlashSale() {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const end = new Date(END).getTime();
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  if (left === null || left <= 0) return null;
  const s = Math.floor(left / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="mx-auto mb-8 max-w-2xl rounded-2xl border border-amber-500/50 bg-gradient-to-r from-amber-500/15 to-amber-500/5 px-5 py-4 text-center">
      <p className="text-sm font-semibold text-amber-200">✨ Launch offer — 15% off your first month with code <span className="rounded bg-amber-500/25 px-1.5 py-0.5 font-mono text-amber-100">MUSE15</span></p>
      <p className="mt-1 font-mono text-lg tracking-wide text-amber-300">
        {d > 0 ? `${d}d ` : ""}{pad(h)}:{pad(m)}:{pad(sec)} <span className="text-xs font-sans text-amber-400/80">left</span>
      </p>
    </div>
  );
}
