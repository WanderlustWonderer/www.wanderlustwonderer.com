"use client";

import { useMemo, useState } from "react";

interface Product { id: string; name: string; description: string | null; price: number; image_url: string | null; }
interface OwnedSession { id: string; product_name: string; starts: string[]; }

function gbp(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: pence % 100 === 0 ? 0 : 2 }).format(pence / 100);
}

export function BookingClient({ products, owned }: { products: Product[]; owned: OwnedSession[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tz = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone, []);

  async function buy(productId: string) {
    setBusy("buy-" + productId); setError(null);
    try {
      const res = await fetch("/api/booking/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId }),
      });
      if (res.status === 401) { window.location.href = "/signup"; return; }
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Could not start checkout");
      window.location.href = data.url;
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); setBusy(null); }
  }

  async function schedule(bookingId: string, startIso: string) {
    setBusy("sch-" + startIso); setError(null);
    try {
      const res = await fetch("/api/booking/schedule", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, startIso }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error === "slot_taken" ? "That time was just taken — pick another." : (data.error ?? "Could not schedule"));
      window.location.reload();
    } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong"); setBusy(null); }
  }

  return (
    <div className="space-y-12">
      {owned.length > 0 && (
        <section>
          <h2 className="mb-1 text-xl font-semibold text-amber-400">Pick your time</h2>
          <p className="mb-5 text-xs text-mute">Default availability is Mon–Fri, 4–9pm UK time. Times shown in your timezone ({tz}). Once you pick, the Muse confirms by email.</p>
          <div className="space-y-6">
            {owned.map((o) => (
              <SessionPicker key={o.id} session={o} busy={busy} onPick={(iso) => schedule(o.id, iso)} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-semibold">Book a session with the Muse</h2>
        <p className="mb-5 text-sm text-mute">Purchase a session, then pick your time. Available to everyone — guest or member.</p>
        <div className="grid gap-5 sm:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-panel">
              {p.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt={p.name} loading="lazy" className="aspect-[3/4] w-full object-cover" />
              )}
              <div className="flex flex-1 flex-col p-6">
                <h3 className="font-semibold">{p.name}</h3>
                <p className="mt-1 text-2xl font-semibold text-accent">{gbp(p.price)}</p>
                {p.description && <p className="mt-2 flex-1 text-sm text-mute">{p.description}</p>}
                <button onClick={() => buy(p.id)} disabled={busy !== null}
                  className="mt-5 rounded-full bg-amber-500 px-5 py-3 text-sm font-medium text-black hover:bg-amber-400 transition disabled:opacity-40">
                  {busy === "buy-" + p.id ? "Opening…" : "Buy this session"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </div>
  );
}

function SessionPicker({ session, busy, onPick }: { session: OwnedSession; busy: string | null; onPick: (iso: string) => void }) {
  const [openDay, setOpenDay] = useState<string | null>(null);

  // Group available starts by local calendar day.
  const days = useMemo(() => {
    const map = new Map<string, { label: string; times: string[] }>();
    for (const iso of session.starts) {
      const d = new Date(iso);
      const key = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
      if (!map.has(key)) map.set(key, { label: key, times: [] });
      map.get(key)!.times.push(iso);
    }
    return [...map.entries()];
  }, [session.starts]);

  return (
    <div className="rounded-2xl border border-amber-500/40 bg-panel p-6">
      <p className="font-semibold">{session.product_name}</p>
      <p className="mt-1 text-sm text-mute">Paid — choose a day, then a time.</p>
      {days.length === 0 ? (
        <p className="mt-4 text-sm text-mute">No times open right now — please check back shortly.</p>
      ) : (
        <div className="mt-4 space-y-2">
          {days.map(([key, day]) => {
            const isOpen = openDay === key;
            return (
              <div key={key} className="rounded-xl border border-line">
                <button onClick={() => setOpenDay(isOpen ? null : key)}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm">
                  <span>{day.label}</span>
                  <span className="text-xs text-mute">{day.times.length} open · {isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && (
                  <div className="flex flex-wrap gap-2 px-4 pb-4">
                    {day.times.map((iso) => (
                      <button key={iso} onClick={() => onPick(iso)} disabled={busy !== null}
                        className="rounded-full border border-line px-4 py-2 text-sm hover:border-accent hover:text-accent transition disabled:opacity-40">
                        {busy === "sch-" + iso ? "Booking…" : new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
