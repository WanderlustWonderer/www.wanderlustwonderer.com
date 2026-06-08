"use client";

import { useState } from "react";

interface Slot { id: string; starts_at: string; duration_min: number; }
interface Product { id: string; name: string; description: string | null; price: number; slots: Slot[]; }

function gbp(pence: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: pence % 100 === 0 ? 0 : 2 }).format(pence / 100);
}

export function BookingClient({ products }: { products: Product[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  async function book(slotId: string) {
    setBusy(slotId);
    setError(null);
    try {
      const res = await fetch("/api/booking/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId }),
      });
      if (res.status === 401) { window.location.href = "/login"; return; }
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Could not start checkout");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setBusy(null);
    }
  }

  function fmt(iso: string) {
    return new Date(iso).toLocaleString("en-GB", {
      weekday: "short", day: "numeric", month: "short",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    <div className="space-y-10">
      <p className="text-center text-xs text-mute">Times shown in your timezone ({tz}).</p>
      {products.map((p) => (
        <section key={p.id} className="rounded-2xl border border-line bg-panel p-6">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-semibold">{p.name}</h2>
            <span className="text-lg font-semibold text-accent">{gbp(p.price)}</span>
          </div>
          {p.description && <p className="mt-2 text-sm text-mute">{p.description}</p>}
          {p.slots.length === 0 ? (
            <p className="mt-5 text-sm text-mute">No times available right now — check back soon.</p>
          ) : (
            <div className="mt-5 flex flex-wrap gap-2">
              {p.slots.map((s) => (
                <button
                  key={s.id}
                  onClick={() => book(s.id)}
                  disabled={busy !== null}
                  className="rounded-full border border-line px-4 py-2 text-sm hover:border-accent hover:text-accent transition disabled:opacity-40"
                >
                  {busy === s.id ? "Opening…" : fmt(s.starts_at)}
                </button>
              ))}
            </div>
          )}
        </section>
      ))}
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </div>
  );
}
