"use client";
import { useState } from "react";

export interface AdminWeek { weekKey: number; title: string; rangeLabel: string; count: number; isDefault: boolean; }

export function VaultWeekTitler({ weeks }: { weeks: AdminWeek[] }) {
  if (weeks.length === 0) {
    return <p className="text-sm text-neutral-500">No archived weeks yet. Once content is older than the live 4-week window, its week appears here to title and sell.</p>;
  }
  return (
    <div className="space-y-2">
      <p className="text-sm text-neutral-400">Title each archived week so members see what it is (e.g. &quot;Week 6 — All content from the Car Wash&quot;). Each week sells for £150.</p>
      <div className="space-y-2">{weeks.map((w) => <Row key={w.weekKey} week={w} />)}</div>
    </div>
  );
}

function Row({ week }: { week: AdminWeek }) {
  const [title, setTitle] = useState(week.isDefault ? "" : week.title);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  async function save() {
    setBusy(true); setSaved(false);
    await fetch("/api/admin/vault-week", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weekKey: week.weekKey, title }) });
    setBusy(false); setSaved(true); setTimeout(() => setSaved(false), 1500);
  }
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900 p-2">
      <span className="text-xs text-neutral-500 w-40 shrink-0">{week.rangeLabel} · {week.count} item{week.count === 1 ? "" : "s"}</span>
      <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, 120))} placeholder="e.g. Week 6 — All content from the Car Wash"
        className="flex-1 min-w-[200px] rounded-md border border-neutral-700 bg-neutral-950 px-3 py-1.5 text-sm text-neutral-100" />
      <button onClick={save} disabled={busy} className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-black hover:bg-amber-400 disabled:opacity-40">{busy ? "…" : saved ? "Saved ✓" : "Save"}</button>
    </div>
  );
}
