"use client";

import { useState } from "react";

interface Product { id: string; name: string; }
interface Slot { id: string; starts_at: string; product_name: string; }
interface Booking { id: string; scheduled_at: string | null; email: string; product_name: string; meeting_url: string | null; status: string; }

export function SlotManager({
  products, openSlots, bookings,
}: { products: Product[]; openSlots: Slot[]; bookings: Booking[] }) {
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [dt, setDt] = useState("");
  const [duration, setDuration] = useState(30);
  const [msg, setMsg] = useState<string | null>(null);

  function fmt(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  async function addSlot() {
    setMsg(null);
    if (!productId || !dt) { setMsg("Pick a session and a date/time."); return; }
    const res = await fetch("/api/admin/slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, startsAtIso: new Date(dt).toISOString(), durationMin: duration }),
    });
    if (res.ok) { window.location.reload(); } else { const d = await res.json(); setMsg(d.error ?? "Failed"); }
  }
  async function delSlot(slotId: string) {
    await fetch("/api/admin/slots", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slotId }) });
    window.location.reload();
  }
  async function setMeeting(bookingId: string, current: string | null) {
    const url = window.prompt("Meeting link (Teams URL):", current ?? "");
    if (url === null) return;
    await fetch("/api/admin/booking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, meetingUrl: url }) });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <p className="mb-3 text-sm font-medium">Add an available slot</p>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-neutral-400">Session
            <select value={productId} onChange={(e) => setProductId(e.target.value)} className="mt-1 block rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100">
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="text-xs text-neutral-400">Date &amp; time (your local)
            <input type="datetime-local" value={dt} onChange={(e) => setDt(e.target.value)} className="mt-1 block rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100" />
          </label>
          <label className="text-xs text-neutral-400">Minutes
            <input type="number" value={duration} min={15} step={15} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1 block w-24 rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100" />
          </label>
          <button onClick={addSlot} className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400">Add slot</button>
        </div>
        {msg && <p className="mt-2 text-xs text-red-400">{msg}</p>}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Open slots ({openSlots.length})</p>
        {openSlots.length === 0 ? <p className="text-sm text-neutral-500">None yet.</p> : (
          <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
            {openSlots.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>{fmt(s.starts_at)} · {s.product_name}</span>
                <button onClick={() => delSlot(s.id)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Upcoming bookings ({bookings.length})</p>
        {bookings.length === 0 ? <p className="text-sm text-neutral-500">None yet.</p> : (
          <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
            {bookings.map((b) => (
              <li key={b.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>{fmt(b.scheduled_at)} · {b.product_name} · {b.email}</span>
                <button onClick={() => setMeeting(b.id, b.meeting_url)} className="text-xs text-amber-400 hover:text-amber-300">
                  {b.meeting_url ? "Edit link" : "Add link"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
