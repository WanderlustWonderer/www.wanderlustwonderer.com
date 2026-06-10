"use client";

import { useState } from "react";

const SEGMENTS: { value: string; label: string }[] = [
  { value: "members", label: "All members" },
  { value: "everyone", label: "Everyone" },
  { value: "guests", label: "Guests (no sub)" },
  { value: "the_gallery", label: "The Gallery" },
  { value: "private_world", label: "Private World" },
  { value: "all_access", label: "All Access" },
];

export function DailyMuse() {
  const [theme, setTheme] = useState("");
  const [segment, setSegment] = useState("members");
  const [drafts, setDrafts] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function generate() {
    setBusy("gen"); setNote(null);
    try {
      const res = await fetch("/api/admin/daily-muse", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.options)) { setNote("Couldn't draft suggestions — try again."); return; }
      setDrafts(data.options);
    } catch { setNote("Something went wrong — try again."); }
    finally { setBusy(null); }
  }

  async function send(idx: number) {
    const content = (drafts[idx] ?? "").trim();
    if (!content) return;
    setBusy("send" + idx); setNote(null);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ segment, content }),
      });
      const data = await res.json();
      if (!res.ok) { setNote("Couldn't send — try again."); return; }
      setNote(`Sent to ${data.sent} member${data.sent === 1 ? "" : "s"}.`);
    } catch { setNote("Something went wrong — try again."); }
    finally { setBusy(null); }
  }

  function edit(idx: number, val: string) {
    setDrafts((d) => d.map((x, i) => (i === idx ? val : x)));
  }

  return (
    <section className="rounded-2xl border border-neutral-700 bg-neutral-900/40 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-100">Daily Muse</h2>
        <span className="text-xs text-neutral-400">Her daily message to keep members coming back</span>
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="Optional: a theme for today (e.g. rainy Sunday, new shoot, missing you)…"
          className="flex-1 rounded-lg border border-neutral-600 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500"
        />
        <button onClick={generate} disabled={busy !== null}
          className="rounded-full bg-amber-500 px-5 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50">
          {busy === "gen" ? "Drafting…" : "Suggest today's messages"}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="text-neutral-400">Send to:</span>
        <select value={segment} onChange={(e) => setSegment(e.target.value)}
          className="rounded-lg border border-neutral-600 bg-neutral-950 px-2 py-1.5 text-sm text-neutral-100">
          {SEGMENTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {note && <p className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">{note}</p>}

      {drafts.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-xs text-neutral-400">Edit any draft before sending — these are suggestions, the final words are yours.</p>
          {drafts.map((d, i) => (
            <div key={i} className="rounded-xl border border-neutral-700 bg-neutral-950 p-3">
              <textarea value={d} onChange={(e) => edit(i, e.target.value)} rows={3}
                className="w-full resize-y rounded-lg bg-transparent text-sm text-neutral-100 outline-none" />
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-xs ${d.length > 280 ? "text-red-400" : "text-neutral-500"}`}>{d.length}/280</span>
                <button onClick={() => send(i)} disabled={busy !== null || !d.trim()}
                  className="rounded-full bg-amber-500 px-4 py-1.5 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-50">
                  {busy === "send" + i ? "Sending…" : "Send this"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
