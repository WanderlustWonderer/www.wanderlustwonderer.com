"use client";

import { useState } from "react";
import { allUploadable } from "@/components/heic-convert";

interface Item { id: string; title: string; min_tier: string; content_type: string; published_at: string | null; live: boolean; }

export function ContentManager({ items }: { items: Item[] }) {
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [minTier, setMinTier] = useState("the_gallery");
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function upload() {
    if (!title || !files || files.length === 0) { setMsg("Add a title and at least one file."); return; }
    const list = Array.from(files);
    const isVideoSel = (list[0].type || "").startsWith("video");
    if (!isVideoSel && list.length > 5) { setMsg("You can upload up to 5 photos at a time."); return; }
    setBusy(true); setMsg(null);
    try {
      const hasHeic = list.some((f) => /heic|heif/i.test(f.type) || /\.(heic|heif)$/i.test(f.name));
      if (hasHeic) setMsg("Converting iPhone photo\u2026");
      const prepared = await allUploadable(list);
      setMsg("Uploading\u2026");
      const fd = new FormData();
      fd.append("title", title); fd.append("caption", caption); fd.append("minTier", minTier);
      const isVideo = (prepared[0].type || "").startsWith("video");
      fd.append("contentType", isVideo ? "video" : (prepared.length > 1 ? "gallery" : "post"));
      for (const f of prepared) fd.append("files", f);
      const res = await fetch("/api/admin/content-item", { method: "POST", body: fd });
      if (res.ok) { window.location.reload(); return; }
      const d = await res.json().catch(() => ({}));
      setMsg(d.error ?? "Upload failed."); setBusy(false);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Upload failed."); setBusy(false);
    }
  }
  async function del(id: string) {
    if (!confirm("Delete this content?")) return;
    await fetch("/api/admin/content-item", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    window.location.reload();
  }
  const tierName: Record<string,string> = { the_gallery: "Gallery", private_world: "Private World", all_access: "All Access" };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <p className="mb-3 text-sm font-medium">Upload content</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Title" className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100" />
          <select value={minTier} onChange={(e)=>setMinTier(e.target.value)} className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100">
            <option value="the_gallery">The Gallery (everyone)</option>
            <option value="private_world">Private World + above</option>
            <option value="all_access">All Access only</option>
          </select>
          <input value={caption} onChange={(e)=>setCaption(e.target.value)} placeholder="Caption (optional)" className="rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 sm:col-span-2" />
          <input type="file" multiple accept="image/*,video/*" onChange={(e)=>{ const f=e.target.files; if(f && Array.from(f).filter(x=>!(x.type||"").startsWith("video")).length>5){ setMsg("You can upload up to 5 photos at a time."); } else { setMsg(null); } setFiles(f); }} className="text-xs text-neutral-300 sm:col-span-2" />
        </div>
        <button onClick={upload} disabled={busy} className="mt-3 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-40">{busy?(msg ?? "Uploading\u2026"):"Publish content"}</button>
        {msg && !busy && <p className="mt-2 text-xs text-red-400">{msg}</p>}
        <p className="mt-2 text-xs text-neutral-500">Up to 5 photos (or one video) per upload. iPhone HEIC photos convert automatically. Visible to the selected tier and above for 4 weeks, then moves to the Vault automatically.</p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Published content ({items.length})</p>
        {items.length === 0 ? <p className="text-sm text-neutral-500">Nothing published yet.</p> : (
          <ul className="divide-y divide-neutral-800 rounded-xl border border-neutral-800">
            {items.map((it)=>(
              <li key={it.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>{it.title} · <span className="text-neutral-400">{tierName[it.min_tier]??it.min_tier}</span> · {it.live ? <span className="text-emerald-400">live</span> : <span className="text-neutral-500">vault</span>} · {it.published_at ? new Date(it.published_at).toLocaleDateString("en-GB") : "—"}</span>
                <button onClick={()=>del(it.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
