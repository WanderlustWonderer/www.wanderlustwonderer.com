"use client";
import { useState } from "react";

type Media = { id: string; label: string };
const SEGMENTS = [
  { v: "everyone", l: "Everyone" },
  { v: "members", l: "All paying members" },
  { v: "guests", l: "Guests (free)" },
  { v: "the_gallery", l: "Gallery members" },
  { v: "private_world", l: "Private World members" },
  { v: "all_access", l: "All Access members" },
];

export function Broadcast({ media }: { media: Media[] }) {
  const [segment, setSegment] = useState("everyone");
  const [content, setContent] = useState("");
  const [ppv, setPpv] = useState(false);
  const [mediaId, setMediaId] = useState(media[0]?.id ?? "");
  const [price, setPrice] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function send() {
    const segLabel = SEGMENTS.find((s) => s.v === segment)?.l;
    if (!confirm(`Send this broadcast to "${segLabel}"? It lands in every matching member's chat.`)) return;
    setBusy(true); setResult(null);
    const r = await fetch("/api/admin/broadcast", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({
        segment, content,
        mediaQueueId: ppv ? mediaId : null,
        pricePence: ppv && price ? Math.round(parseFloat(price) * 100) : null,
        caption: ppv ? caption : null,
      }),
    });
    const d = await r.json().catch(() => ({}));
    setBusy(false);
    setResult(r.ok ? `Sent to ${d.sent} member${d.sent === 1 ? "" : "s"} ✓` : `Failed: ${d.error ?? "error"}`);
    if (r.ok) { setContent(""); setCaption(""); setPrice(""); setPpv(false); }
  }

  const inputCls = "w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-amber-500";

  return (
    <section className="mt-10 rounded-2xl border border-neutral-700 p-6">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-200">Broadcast a message</h2>
      <p className="mb-4 mt-1 text-sm text-neutral-300">Send to a whole segment at once. Tip: lock a photo/video as pay-to-unlock to monetise the base.</p>
      <div className="grid gap-3 sm:grid-cols-[200px,1fr]">
        <select value={segment} onChange={(e) => setSegment(e.target.value)} className={inputCls}>
          {SEGMENTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
        </select>
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={3} placeholder="Your message… (the teaser they'll read)" className={inputCls} />
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-neutral-200">
        <input type="checkbox" checked={ppv} onChange={(e) => setPpv(e.target.checked)} />
        Lock a photo/video as pay-to-unlock (PPV)
      </label>

      {ppv && (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <select value={mediaId} onChange={(e) => setMediaId(e.target.value)} className={inputCls}>
            {media.length === 0 && <option value="">No queued media</option>}
            {media.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9.]/g, ""))} inputMode="decimal" placeholder="Price £" className={inputCls} />
          <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Locked caption (optional)" className={inputCls} />
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button onClick={send} disabled={busy || (!content && !ppv)} className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-medium text-black transition hover:bg-amber-400 disabled:opacity-50">
          {busy ? "Sending…" : "Send broadcast"}
        </button>
        {result && <span className={`text-sm ${result.startsWith("Sent") ? "text-emerald-400" : "text-red-400"}`}>{result}</span>}
      </div>
    </section>
  );
}
