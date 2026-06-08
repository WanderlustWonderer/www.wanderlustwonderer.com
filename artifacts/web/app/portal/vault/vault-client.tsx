"use client";
import { useState } from "react";

interface Block { periodKey: number; label: string; count: number; owned: boolean; }

export function VaultClient({ blocks, vaultFull }: { blocks: Block[]; vaultFull: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  // The most recent unowned 4-week block (what "the last 4-week block" unlocks).
  const latestBlock = blocks.find((b) => !b.owned) ?? null;

  async function buy(kind: string, periodKey?: number) {
    setBusy(kind + (periodKey ?? ""));
    const res = await fetch("/api/vault/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, periodKey }) });
    const d = await res.json();
    if (res.ok && d.url) window.location.href = d.url; else setBusy(null);
  }

  return (
    <div className="space-y-6">
      {/* ── The last 4-week block (above, same styling) ── */}
      <div className="rounded-2xl border border-amber-500/60 p-6 text-center">
        <h2 className="text-2xl font-semibold">The Last 4-Week Block</h2>
        <p className="mt-1 text-sm text-neutral-400">The most recent 4 weeks of archived content.</p>
        <p className="mt-4">
          <span className="text-lg text-neutral-500 line-through">£415</span>
          <span className="ml-3 text-3xl font-semibold">£350</span>
        </p>
        <p className="mt-1 inline-block rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-400">Save £65</p>
        <div className="mt-4">
          {vaultFull ? (
            <p className="font-medium text-emerald-400">✓ Included in your Vault</p>
          ) : latestBlock ? (
            <button onClick={() => buy("block", latestBlock.periodKey)} disabled={busy !== null} className="rounded-full bg-amber-500 px-8 py-3 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-40">
              {busy === "block" + latestBlock.periodKey ? "Opening…" : "Unlock the last 4 weeks · £350"}
            </button>
          ) : (
            <p className="text-sm text-neutral-500">No archived content yet — everything is still in the live 4-week window.</p>
          )}
        </div>
      </div>

      {/* ── The Vault (below, same styling) ── */}
      <div className={`rounded-2xl border p-6 text-center ${vaultFull ? "border-emerald-500/50" : "border-amber-500/60"}`}>
        <h2 className="text-2xl font-semibold">The Vault</h2>
        <p className="mt-1 text-sm text-neutral-400">The last 12 weeks of content — every tier.</p>
        <p className="mt-4">
          <span className="text-lg text-neutral-500 line-through">£1,050</span>
          <span className="ml-3 text-3xl font-semibold">£888</span>
        </p>
        <p className="mt-1 inline-block rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-400">Save £162 vs buying each block</p>
        <div className="mt-4">
          {vaultFull ? (
            <p className="font-medium text-emerald-400">✓ You own The Vault</p>
          ) : (
            <button onClick={() => buy("vault_full")} disabled={busy !== null} className="rounded-full bg-amber-500 px-8 py-3 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-40">
              {busy === "vault_full" ? "Opening…" : "Unlock everything · £888"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
