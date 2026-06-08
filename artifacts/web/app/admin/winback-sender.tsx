"use client";

import { useState } from "react";

const TOUCHES = [
  { v: 1, label: "Touch 1 — The door reopened (no discount)" },
  { v: 2, label: "Touch 2 — 25% off for life" },
  { v: 3, label: "Touch 3 — Personal + free session" },
  { v: 4, label: "Touch 4 — 50% off first month (final)" },
];

export function WinbackSender() {
  const [touch, setTouch] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sendTest() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/admin/winback/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ touch, test: true, name: "there" }),
    });
    const d = await res.json().catch(() => ({}));
    setMsg(res.ok ? `Test sent to you ✓ (${d.to})` : `Failed: ${d.error ?? "unknown"}`);
    setBusy(false);
  }

  return (
    <div className="mb-4 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
      <p className="mb-2 text-xs font-medium text-neutral-300">Campaign emails · send a TEST to yourself first</p>
      <div className="flex flex-wrap items-center gap-2">
        <select value={touch} onChange={(e) => setTouch(Number(e.target.value))}
          className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-100">
          {TOUCHES.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
        </select>
        <button onClick={sendTest} disabled={busy}
          className="rounded-md border border-amber-500/50 px-3 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/10 disabled:opacity-40">
          {busy ? "Sending…" : "Send test to me"}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-neutral-400">{msg}</p>}
      <p className="mt-2 text-xs text-neutral-600">Live sends to customers stay disabled until you give the go. Requires a verified sending domain.</p>
    </div>
  );
}
