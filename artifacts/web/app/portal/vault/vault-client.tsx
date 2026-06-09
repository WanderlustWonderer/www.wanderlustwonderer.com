"use client";
import { useMemo, useState } from "react";

interface Week { weekKey: number; title: string; rangeLabel: string; count: number; owned: boolean; }

const WEEK_PRICE = 15000;       // £150 in pence
const BULK_MIN = 4;
const BULK_OFF = 0.2;

function gbp(pence: number) {
  return "£" + (pence / 100).toLocaleString("en-GB", { minimumFractionDigits: pence % 100 === 0 ? 0 : 2 });
}
function priceFor(n: number) {
  const gross = n * WEEK_PRICE;
  return n >= BULK_MIN ? Math.round(gross * (1 - BULK_OFF)) : gross;
}

export function VaultClient({ weeks, vaultFull }: { weeks: Week[]; vaultFull: boolean }) {
  const available = weeks.filter((w) => !w.owned);
  const owned = weeks.filter((w) => w.owned);
  const [open, setOpen] = useState(true);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const count = sel.size;
  const gross = count * WEEK_PRICE;
  const total = priceFor(count);
  const discounted = count >= BULK_MIN;

  const allSelected = available.length > 0 && available.every((w) => sel.has(w.weekKey));

  function toggle(k: number) {
    setSel((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else if (n.size < 20) n.add(k);
      return n;
    });
  }
  function selectAll() {
    setSel(allSelected ? new Set() : new Set(available.slice(0, 20).map((w) => w.weekKey)));
  }

  async function buy() {
    if (count === 0 || busy) return;
    setBusy(true);
    const res = await fetch("/api/vault/checkout", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "weeks", weekKeys: [...sel] }),
    });
    const d = await res.json();
    if (res.ok && d.url) window.location.href = d.url; else setBusy(false);
  }

  if (vaultFull) {
    return <div className="rounded-2xl border border-emerald-500/50 p-6 text-center"><p className="font-medium text-emerald-400">✓ You own the full Vault — every archived week is unlocked.</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-500/50 p-6">
        <h2 className="text-center text-2xl font-semibold">Buy by the week</h2>
        <p className="mt-1 text-center text-sm text-neutral-400">
          £150 unlocks everything from that week. Pick as many as you like (up to 20). <span className="text-emerald-400">Choose 4 or more weeks and save 20%.</span>
        </p>

        {available.length === 0 ? (
          <p className="mt-6 text-center text-sm text-neutral-500">No archived weeks yet — everything is still in the live 4-week window.</p>
        ) : (
          <>
            <div className="mt-6">
              <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm">
                <span>{count > 0 ? `${count} week${count > 1 ? "s" : ""} selected` : "Select weeks to unlock"}</span>
                <span className="flex items-center gap-3">
                  <span className="text-amber-400" onClick={(e) => { e.stopPropagation(); selectAll(); }}>{allSelected ? "Clear all" : "Select all"}</span>
                  <span className="text-neutral-500">{open ? "▲" : "▼"}</span>
                </span>
              </button>
              {open && (
                <div className="mt-2 max-h-80 overflow-y-auto rounded-xl border border-neutral-800">
                  {available.map((w) => {
                    const checked = sel.has(w.weekKey);
                    return (
                      <label key={w.weekKey} className={`flex cursor-pointer items-center gap-3 border-b border-neutral-800 px-4 py-3 last:border-0 ${checked ? "bg-amber-500/10" : "hover:bg-neutral-900"}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggle(w.weekKey)} className="h-4 w-4 accent-amber-500" />
                        <span className="flex-1">
                          <span className="block text-sm font-medium text-neutral-100">{w.title}</span>
                          <span className="block text-xs text-neutral-500">{w.rangeLabel} · {w.count} item{w.count === 1 ? "" : "s"}</span>
                        </span>
                        <span className="text-sm font-semibold text-amber-500">£150</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-col items-center gap-3">
              {count > 0 && (
                <p className="text-center">
                  {discounted && <span className="mr-2 text-lg text-neutral-500 line-through">{gbp(gross)}</span>}
                  <span className="text-3xl font-semibold">{gbp(total)}</span>
                  {discounted && <span className="ml-3 inline-block rounded-full bg-emerald-500/15 px-3 py-1 text-sm font-semibold text-emerald-400">20% off · save {gbp(gross - total)}</span>}
                </p>
              )}
              <button onClick={buy} disabled={count === 0 || busy}
                className="rounded-full bg-amber-500 px-8 py-3 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-40">
                {busy ? "Opening…" : count === 0 ? "Select weeks to continue" : `Unlock ${count} week${count > 1 ? "s" : ""} · ${gbp(total)}`}
              </button>
            </div>
          </>
        )}
      </div>

      {owned.length > 0 && (
        <div className="rounded-2xl border border-emerald-500/40 p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-400">Weeks you own</h3>
          <ul className="mt-3 space-y-1 text-sm text-neutral-300">
            {owned.map((w) => <li key={w.weekKey}>✓ {w.title} <span className="text-neutral-600">· {w.rangeLabel}</span></li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
