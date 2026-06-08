"use client";

import { useState } from "react";

interface Slot { id: string; starts_at: string; duration_min: number; }
interface Product { id: string; name: string; description: string | null; price: number; }
interface OwnedSession { id: string; product_id: string; product_name: string; slots: Slot[]; }

function gbp(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: pence % 100 === 0 ? 0 : 2 }).format(pence / 100);
}
function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function BookingClient({
  products, owned,
}: { products: Product[]; owned: OwnedSession[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  async function buy(productId: string) {
    setBusy("buy-" + productId); setError(null);
    try {
      const res = await fetch("/api/booking/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (res.status === 401) { window.location.href = "/login?next=/book"; return; }
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Could not start checkout");
      window.location.href = data.url;
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); setBusy(null); }
  }

  async function schedule(bookingId: string, slotId: string) {
    setBusy("sch-" + slotId); setError(null);
    try {
      const res = await fetch("/api/booking/schedule", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, slotId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error === "slot_taken" ? "That time was just taken — pick another." : (data.error ?? "Could not schedule"));
      window.location.reload();
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); setBusy(null); }
  }

  return (
    <div className="space-y-12">
      {/* Sessions the member owns but hasn't scheduled */}
      {owned.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-semibold text-amber-400">Schedule your sessions</h2>
          <p className="mb-4 text-xs text-mute">Times shown in your timezone ({tz}).</p>
          <div className="space-y-5">
            {owned.map((o) => (
              <div key={o.id} className="rounded-2xl border border-amber-500/40 bg-panel p-6">
                <p className="font-semibold">{o.product_name}</p>
                <p className="mt-1 text-sm text-mute">Paid — choose a time below.</p>
                {o.slots.length === 0 ? (
                  <p className="mt-4 text-sm text-mute">No times open yet — check back soon, the Muse adds availability regularly.</p>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {o.slots.map((s) => (
                      <button key={s.id} onClick={() => schedule(o.id, s.id)} disabled={busy !== null}
                        className="rounded-full border border-line px-4 py-2 text-sm hover:border-accent hover:text-accent transition disabled:opacity-40">
                        {busy === "sch-" + s.id ? "Booking…" : fmt(s.starts_at)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Buy a session */}
      <section>
        <h2 className="mb-4 text-xl font-semibold">Book a session with the Muse</h2>
        <p className="mb-5 text-sm text-mute">Purchase a session, then pick your time. Available to everyone — guest or member.</p>
        <div className="grid gap-5 sm:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="flex flex-col rounded-2xl border border-line bg-panel p-6">
              <h3 className="font-semibold">{p.name}</h3>
              <p className="mt-1 text-2xl font-semibold text-accent">{gbp(p.price)}</p>
              {p.description && <p className="mt-2 flex-1 text-sm text-mute">{p.description}</p>}
              <button onClick={() => buy(p.id)} disabled={busy !== null}
                className="mt-5 rounded-full bg-amber-500 px-5 py-3 text-sm font-medium text-black hover:bg-amber-400 transition disabled:opacity-40">
                {busy === "buy-" + p.id ? "Opening…" : "Buy this session"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </div>
  );
}
