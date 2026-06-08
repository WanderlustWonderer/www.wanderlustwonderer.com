"use client";
import { useState } from "react";

interface Block { periodKey: number; label: string; count: number; owned: boolean; }

export function VaultClient({ blocks, vaultFull }: { blocks: Block[]; vaultFull: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  async function buy(kind: string, periodKey?: number) {
    setBusy(kind + (periodKey ?? ""));
    const res = await fetch("/api/vault/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, periodKey }) });
    const d = await res.json();
    if (res.ok && d.url) window.location.href = d.url; else setBusy(null);
  }
  return (
    <div className="space-y-8">
      <div className={`rounded-2xl border p-6 text-center ${vaultFull ? "border-emerald-500/50" : "border-amber-500/60"}`}>
        <h2 className="text-2xl font-semibold">Full Vault</h2>
        <p className="mt-1 text-sm text-neutral-400">Lifetime access to all archived content, every tier.</p>
        {vaultFull ? (
          <p className="mt-4 font-medium text-emerald-400">✓ You own the Full Vault</p>
        ) : (
          <button onClick={() => buy("vault_full")} disabled={busy !== null} className="mt-4 rounded-full bg-amber-500 px-8 py-3 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-40">
            {busy === "vault_full" ? "Opening…" : "Unlock everything · £199"}
          </button>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-lg font-semibold">Or unlock by 4-week block</h3>
        {blocks.length === 0 ? (
          <p className="text-sm text-neutral-500">No archived content yet — everything is still in the live window.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {blocks.map((b) => (
              <div key={b.periodKey} className="flex items-center justify-between rounded-xl border border-neutral-800 p-4">
                <div>
                  <p className="text-sm font-medium">{b.label}</p>
                  <p className="text-xs text-neutral-500">{b.count} item{b.count === 1 ? "" : "s"}</p>
                </div>
                {b.owned || vaultFull ? (
                  <span className="text-xs text-emerald-400">✓ Unlocked</span>
                ) : (
                  <button onClick={() => buy("block", b.periodKey)} disabled={busy !== null} className="rounded-full border border-amber-500/50 px-4 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10 disabled:opacity-40">
                    {busy === "block" + b.periodKey ? "…" : "Unlock · £29"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
