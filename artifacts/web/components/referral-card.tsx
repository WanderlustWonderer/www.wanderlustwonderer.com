"use client";
import { useState } from "react";

export function ReferralCard({ code, count, earned, bonus }: { code: string; count: number; earned: number; bonus: number }) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/?ref=${code}` : `/?ref=${code}`;

  function copy() {
    navigator.clipboard?.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); });
  }

  return (
    <section className="mt-10 rounded-2xl border border-amber-500/40 bg-amber-500/5 p-8">
      <h2 className="text-lg font-semibold">Invite friends, both get rewarded ✨</h2>
      <p className="mt-1 text-sm opacity-70">
        Share your link. When a friend joins through it, you <span className="text-amber-400">both</span> get {bonus} free messages with the Muse.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <input readOnly value={link} className="flex-1 min-w-[14rem] rounded-full border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-neutral-300" />
        <button onClick={copy} className="rounded-full bg-amber-500 px-5 py-2 text-sm font-medium text-black hover:bg-amber-400">
          {copied ? "Copied ✓" : "Copy link"}
        </button>
      </div>
      <div className="mt-4 flex gap-8 text-sm">
        <span><span className="text-2xl font-semibold text-amber-400">{count}</span> <span className="opacity-60">friend{count === 1 ? "" : "s"} joined</span></span>
        <span><span className="text-2xl font-semibold text-amber-400">{earned}</span> <span className="opacity-60">credits earned</span></span>
      </div>
    </section>
  );
}
