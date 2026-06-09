"use client";

import { useState } from "react";
import { toUploadable } from "@/components/heic-convert";

export interface QueueItem {
  id: string; kind: string; price_pence: number; caption: string; position: number;
  signedUrl: string | null; unlockedCount: number;
}
interface Row { id: string; file: File; caption: string; }

function baseName(name: string): string { return name.replace(/\.[^./\\]+$/, "").trim(); }
function gbp(p: number) { return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: p % 100 === 0 ? 0 : 2 }).format(p / 100); }

export function QueueManager({ items }: { items: QueueItem[] }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [isVideo, setIsVideo] = useState(false);
  const [price, setPrice] = useState(10);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const photos = items.filter((i) => i.kind === "photo");
  const videos = items.filter((i) => i.kind === "video");

  function onChoose(files: FileList | null) {
    setMsg(null);
    if (!files || files.length === 0) { setRows([]); setIsVideo(false); return; }
    const list = Array.from(files);
    const video = (list[0].type || "").startsWith("video");
    setIsVideo(video);
    let chosen = video ? [list[0]] : list.filter((f) => !(f.type || "").startsWith("video"));
    if (!video && chosen.length > 10) { setMsg("Up to 10 photos per batch — using the first 10."); chosen = chosen.slice(0, 10); }
    setPrice(video ? 25 : 10);
    setRows(chosen.map((file, i) => ({ id: `${Date.now()}-${i}`, file, caption: baseName(file.name) })));
  }
  function setCaption(id: string, v: string) { setRows((r) => r.map((x) => x.id === id ? { ...x, caption: v } : x)); }

  async function addToQueue() {
    if (rows.length === 0) { setMsg("Choose at least one file."); return; }
    if (price <= 0) { setMsg("Set a price above £0."); return; }
    setBusy(true); setMsg(null);
    try {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setMsg(`Adding ${i + 1} of ${rows.length}…`);
        const prepared = isVideo ? row.file : await toUploadable(row.file);
        const fd = new FormData();
        fd.append("file", prepared);
        fd.append("kind", isVideo ? "video" : "photo");
        fd.append("pricePence", String(Math.round(price * 100)));
        fd.append("caption", row.caption);
        const res = await fetch("/api/admin/queue", { method: "POST", body: fd });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setMsg(`Item ${i + 1} failed: ${d.error ?? "upload error"}`); setBusy(false); return;
        }
      }
      window.location.reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Could not add to queue."); setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this item from the queue? Fans who already unlocked it keep it.")) return;
    await fetch(`/api/admin/queue?id=${id}`, { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-400">
        Upload photos/videos once into a shared queue. Each fan can unlock items one at a time from their chat, in order —
        and never receives the same item twice. {photos.length} photo{photos.length === 1 ? "" : "s"} · {videos.length} video{videos.length === 1 ? "" : "s"} live.
      </p>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <p className="mb-2 text-xs font-medium text-neutral-300">Add to queue</p>
        <label className="inline-flex cursor-pointer items-center rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400">
          Choose files
          <input type="file" accept="image/*,video/*" multiple onChange={(e) => onChoose(e.target.files)} className="hidden" />
        </label>
        {rows.length > 0 && <span className="ml-3 text-xs text-neutral-400">{rows.length} file{rows.length === 1 ? "" : "s"} selected</span>}
        <p className="mt-2 text-[11px] text-neutral-500">Tip: to add Google Drive files to this queue, use Import from Google Drive below and set “Add to → Content queue”.</p>
        {rows.length > 0 && (
          <div className="mt-3 space-y-2">
            <label className="block text-xs text-neutral-400">
              Price per {isVideo ? "video" : "photo"} · £
              <input type="number" min={1} step={1} value={price} onChange={(e) => setPrice(Number(e.target.value))}
                className="ml-1 w-20 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-100" />
            </label>
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-2">
                <span className="text-xs text-neutral-500 truncate max-w-[40%]">{r.file.name}</span>
                <input value={r.caption} onChange={(e) => setCaption(r.id, e.target.value)} placeholder="caption (optional)"
                  className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-100" />
              </div>
            ))}
            <button onClick={addToQueue} disabled={busy}
              className="mt-1 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-40">
              {busy ? "Adding…" : `Add ${rows.length} ${isVideo ? "video" : "photo" + (rows.length === 1 ? "" : "s")} to queue`}
            </button>
          </div>
        )}
        {msg && <p className="mt-2 text-xs text-amber-400">{msg}</p>}
      </div>

      {items.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-neutral-400">In the queue (order fans receive them)</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {items.map((it) => (
              <div key={it.id} className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-2">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-800 bg-neutral-950 text-[10px] text-neutral-500">
                  {it.kind === "photo" && it.signedUrl
                    ? <img src={it.signedUrl} alt="" className="h-full w-full object-cover" />
                    : (it.kind === "video" ? "▶ video" : "photo")}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-neutral-200">{it.caption || (it.kind === "video" ? "Video" : "Photo")}</p>
                  <p className="text-[11px] text-neutral-500">{gbp(it.price_pence)} · unlocked by {it.unlockedCount} fan{it.unlockedCount === 1 ? "" : "s"}</p>
                </div>
                <button onClick={() => remove(it.id)} className="shrink-0 rounded-md border border-neutral-700 px-2 py-1 text-[11px] text-neutral-400 hover:border-red-500 hover:text-red-400">Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
