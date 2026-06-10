"use client";

import { useState } from "react";

interface Product { id: string; name: string; }
interface Slot { id: string; starts_at: string; product_name: string; }
interface Booking { id: string; scheduled_at: string | null; email: string; product_name: string; meeting_url: string | null; status: string; }

export function SlotManager({
  bookings,
}: { products?: Product[]; openSlots?: Slot[]; bookings: Booking[] }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  function fmt(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/London" }) + " UK";
  }

  async function setMeeting(bookingId: string, current: string | null) {
    const url = window.prompt("Private link to send the member (Teams/Zoom URL):", current ?? "");
    if (url === null) return;
    setBusy(bookingId);
    await fetch("/api/admin/booking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, meetingUrl: url }) });
    window.location.reload();
  }

  async function accept(bookingId: string) {
    if (!confirm("Accept this booking and email the member a confirmation?")) return;
    setBusy(bookingId); setMsg(null);
    const res = await fetch("/api/admin/booking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, action: "accept" }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { setMsg(d.error ?? "Could not accept."); setBusy(null); return; }
    if (d.emailStatus && d.emailStatus !== "sent") {
      setMsg(`Booking confirmed, but the email didn't send (${d.emailStatus}). Check the member has an email and a verified sending domain is set.`);
      setBusy(null); return;
    }
    window.location.reload();
  }

  const pending = bookings.filter((b) => b.status !== "confirmed");
  const confirmed = bookings.filter((b) => b.status === "confirmed");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm">
        <p className="font-medium text-amber-400">Availability is automatic</p>
        <p className="mt-1 text-neutral-300">
          Your calendar is open <span className="text-neutral-200">Monday–Friday, 4–9pm UK time</span> by default. After a member pays, they pick an open time — booked times disappear automatically. You just confirm each one below and the member gets an email.
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Awaiting your confirmation ({pending.length})</p>
        {pending.length === 0 ? <p className="text-sm text-neutral-300">Nothing waiting.</p> : (
          <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
            {pending.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>{fmt(b.scheduled_at)} · {b.product_name} · <span className="text-neutral-300">{b.email}</span></span>
                <div className="flex items-center gap-3">
                  <button onClick={() => setMeeting(b.id, b.meeting_url)} disabled={busy === b.id} className="text-xs text-neutral-300 hover:text-amber-300">
                    {b.meeting_url ? "Edit link" : "Add link"}
                  </button>
                  <button onClick={() => accept(b.id)} disabled={busy === b.id}
                    className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-black hover:bg-amber-400 disabled:opacity-40">
                    {busy === b.id ? "…" : "Accept & email"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {msg && <p className="mt-2 text-xs text-amber-400">{msg}</p>}
      </div>

      {confirmed.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">Confirmed ({confirmed.length})</p>
          <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
            {confirmed.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <span>{fmt(b.scheduled_at)} · {b.product_name} · <span className="text-neutral-300">{b.email}</span></span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-emerald-400">Confirmed ✓</span>
                  <button onClick={() => setMeeting(b.id, b.meeting_url)} disabled={busy === b.id} className="text-xs text-neutral-300 hover:text-amber-300">
                    {b.meeting_url ? "Edit link" : "Add link"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
