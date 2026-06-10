"use client";

import { useState } from "react";
import { toUploadable } from "@/components/heic-convert";

interface Item { id: string; title: string; min_tier: string; content_type: string; published_at: string | null; live: boolean; }
interface Row { id: string; file: File; title: string; caption: string; }

function baseName(name: string): string {
  return name.replace(/\.[^./\\]+$/, "").trim();
}

export function ContentManager({ items }: { items: Item[] }) {
  const [minTier, setMinTier] = useState("the_gallery");
  const [rows, setRows] = useState<Row[]>([]);
  const [isVideo, setIsVideo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PER = 10;

  function onChoose(files: FileList | null) {
    setMsg(null);
    if (!files || files.length === 0) { setRows([]); setIsVideo(false); return; }
    const list = Array.from(files);
    const video = (list[0].type || "").startsWith("video");
    setIsVideo(video);
    let chosen = list;
    if (video) {
      chosen = [list[0]]; // one video at a time
    } else {
      chosen = list.filter((f) => !(f.type || "").startsWith("video"));
      if (chosen.length > 5) { setMsg("Up to 5 photos per upload — using the first 5."); chosen = chosen.slice(0, 5); }
    }
    setRows(chosen.map((file, i) => ({ id: `${Date.now()}-${i}`, file, title: baseName(file.name), caption: "" })));
  }

  function setTitle(id: string, v: string) { setRows((r) => r.map((x) => x.id === id ? { ...x, title: v } : x)); }
  function setCaption(id: string, v: string) { setRows((r) => r.map((x) => x.id === id ? { ...x, caption: v } : x)); }

  async function publish() {
    if (rows.length === 0) { setMsg("Choose at least one file."); return; }
    if (rows.some((r) => !r.title.trim())) { setMsg("Every image needs a title."); return; }
    setBusy(true); setMsg(null);
    try {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setMsg(`Publishing ${i + 1} of ${rows.length}…`);
        const prepared = await toUploadable(row.file);
        const fd = new FormData();
        fd.append("title", row.title.trim());
        fd.append("caption", row.caption);
        fd.append("minTier", minTier);
        fd.append("contentType", isVideo ? "video" : "post");
        fd.append("files", prepared);
        const res = await fetch("/api/admin/content-item", { method: "POST", body: fd });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          setMsg(`"${row.title}" failed: ${d.error ?? "upload error"}`); setBusy(false); return;
        }
      }
      window.location.reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed."); setBusy(false);
    }
  }

  async function del(id: string) {
    if (!confirm("Delete this content?")) return;
    await fetch("/api/admin/content-item", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    window.location.reload();
  }

  const tierName: Record<string, string> = { the_gallery: "Gallery", private_world: "Private World", all_access: "All Access" };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <p className="mb-3 text-sm font-medium">Upload content</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <select value={minTier} onChange={(e) => setMinTier(e.target.value)} className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 sm:col-span-2">
            <option value="the_gallery">The Gallery (everyone)</option>
            <option value="private_world">Private World + above</option>
            <option value="all_access">All Access only</option>
          </select>
          <div className="sm:col-span-2">
            <label className="inline-flex cursor-pointer items-center rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400">
              Choose files
              <input type="file" multiple accept="image/*,video/*" onChange={(e) => onChoose(e.target.files)} className="hidden" />
            </label>
            {rows.length > 0 && <span className="ml-3 text-xs text-neutral-300">{rows.length} file{rows.length === 1 ? "" : "s"} selected</span>}
          </div>
        </div>

        {rows.length > 0 && (
          <div className="mt-4 space-y-3">
            <p className="text-xs uppercase tracking-wide text-neutral-400">
              {isVideo ? "Video" : `${rows.length} photo${rows.length > 1 ? "s" : ""}`} · edit titles, then publish
            </p>
            {rows.map((row, i) => (
              <div key={row.id} className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                <p className="mb-2 truncate text-xs text-neutral-400">{i + 1}. {row.file.name}</p>
                <input
                  value={row.title}
                  onChange={(e) => setTitle(row.id, e.target.value)}
                  placeholder="Title"
                  className="mb-2 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
                />
                <input
                  value={row.caption}
                  onChange={(e) => setCaption(row.id, e.target.value)}
                  placeholder="Caption (optional)"
                  className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100"
                />
              </div>
            ))}
          </div>
        )}

        <button onClick={publish} disabled={busy || rows.length === 0} className="mt-3 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-40">
          {busy ? (msg ?? "Publishing…") : "Publish content"}
        </button>
        {msg && !busy && <p className="mt-2 text-xs text-amber-400">{msg}</p>}
        <p className="mt-2 text-xs text-neutral-400">Up to 5 photos (or one video) per upload — each is published with its own title (auto-filled from the file name, fully editable). iPhone HEIC photos convert automatically. Visible to the selected tier and above for 4 weeks, then moves to the Vault automatically.</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Published content ({items.length})</p>
        {items.length === 0 ? <p className="text-sm text-neutral-400">Nothing published yet.</p> : (
          <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
            {items.slice(page * PER, page * PER + PER).map((it) => (
              <li key={it.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>{it.title} · <span className="text-neutral-300">{tierName[it.min_tier] ?? it.min_tier}</span> · {it.live ? <span className="text-emerald-400">live</span> : <span className="text-neutral-400">vault</span>} · {it.published_at ? new Date(it.published_at).toLocaleDateString("en-GB") : "—"}</span>
                <button onClick={() => del(it.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
              </li>
            ))}
          </ul>
        )}
        {items.length > PER && (
          <div className="mt-3 flex items-center justify-between text-xs text-neutral-300">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="rounded-md border border-neutral-700 px-3 py-1 disabled:opacity-30">Prev</button>
            <span>Page {page + 1} of {Math.ceil(items.length / PER)}</span>
            <button onClick={() => setPage((p) => Math.min(Math.ceil(items.length / PER) - 1, p + 1))} disabled={page >= Math.ceil(items.length / PER) - 1} className="rounded-md border border-neutral-700 px-3 py-1 disabled:opacity-30">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
