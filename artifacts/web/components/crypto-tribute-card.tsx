"use client";

import { useState } from "react";

const WALLET = "AWejVaRKnJKwkKafCMBoPwkukDQxSXeGvS5zL8M5UShg";
const HANDLE = "@WanderlustWndr";

/** A non-Stripe "product" in The Collection: a direct Solana (SOL) crypto tribute. */
export function CryptoTributeCard() {
  const [copied, setCopied] = useState(false);
  function copy() {
    try {
      navigator.clipboard.writeText(WALLET).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      });
    } catch { /* ignore */ }
  }
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-amber-500/40 bg-amber-500/5">
      <div className="flex flex-1 flex-col p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">Crypto Tribute</h2>
          <span className="whitespace-nowrap text-lg font-semibold text-amber-500">Solana</span>
        </div>
        <span className="mt-2 w-fit rounded-full border border-amber-500/50 px-3 py-0.5 text-xs uppercase tracking-wide text-amber-500">SOL · any amount</span>
        <p className="mt-3 flex-1 text-sm opacity-70">
          Direct devotion, paid in crypto. Send your tribute in Solana (SOL) straight to my wallet — any amount, sent with silence. {HANDLE}
        </p>
        <div className="mt-4 rounded-lg border border-neutral-700 bg-black/30 p-3">
          <p className="break-all font-mono text-xs text-amber-400">{WALLET}</p>
        </div>
        <p className="mt-2 text-[11px] italic opacity-50">Send only Solana (SOL) to this address. Crypto transfers are irreversible.</p>
        <div className="mt-4">
          <button onClick={copy} className="btn-primary w-full">{copied ? "Copied ✓" : "Copy wallet address"}</button>
        </div>
      </div>
    </div>
  );
}
