"use client";
import { useState } from "react";

export function TipButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState("");

  async function tip(pence: number) {
    if (busy || pence < 100) return;
    setBusy(true);
    try {
      const res = await fetch("/api/tip/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amountPence: pence }) });
      if (res.status === 401) { window.location.href = "/signup"; return; }
      const d = await res.json();
      if (d.url) window.location.href = d.url; else setBusy(false);
    } catch { setBusy(false); }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="text-mute hover:text-accent transition">💝 Tip</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-xs rounded-2xl border border-line bg-panel p-6 text-center text-fg" onClick={(e) => e.stopPropagation()}>
            <p className="text-base font-semibold">Spoil the Muse 💝</p>
            <p className="mt-1 text-xs text-mute">A little gift goes a long way.</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[500, 1000, 2000].map((p) => (
                <button key={p} onClick={() => tip(p)} disabled={busy} className="rounded-full border border-line py-2 text-sm hover:border-accent hover:text-accent disabled:opacity-40">£{p / 100}</button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-sm text-mute">£</span>
              <input value={custom} onChange={(e) => setCustom(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="custom" inputMode="decimal"
                className="w-full rounded-full border border-line bg-panel-2 px-3 py-2 text-sm outline-none focus:border-accent" />
              <button onClick={() => tip(Math.round(parseFloat(custom || "0") * 100))} disabled={busy || !custom}
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-[#14060c] disabled:opacity-40">Send</button>
            </div>
            <button onClick={() => setOpen(false)} disabled={busy} className="mt-4 text-xs text-mute hover:text-fg">{busy ? "Opening…" : "Maybe later"}</button>
          </div>
        </div>
      )}
    </>
  );
}
