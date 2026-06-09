"use client";
import { useEffect, useMemo, useState } from "react";

interface DFile { id: string; name: string; mimeType: string; size?: string; folder?: string; }

const BATCH = 25;

export function GdriveImporter() {
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [files, setFiles] = useState<DFile[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [tier, setTier] = useState("the_gallery");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true); setErr(null);
    try {
      const res = await fetch("/api/admin/gdrive/list");
      const d = await res.json();
      setConfigured(!!d.configured);
      setFiles(d.files ?? []);
      if (d.error) setErr(d.error);
    } catch { setErr("Couldn't reach Google Drive."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  // Group files by their (sub)folder name, e.g. "Week 6 : ".
  const groups = useMemo(() => {
    const m = new Map<string, DFile[]>();
    for (const f of files) {
      const k = f.folder || "Top level";
      (m.get(k) ?? m.set(k, []).get(k)!).push(f);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  }, [files]);

  function toggle(id: string) {
    setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleGroup(ids: string[], allOn: boolean) {
    setSel((s) => { const n = new Set(s); ids.forEach((id) => (allOn ? n.delete(id) : n.add(id))); return n; });
  }

  async function importSel() {
    if (sel.size === 0 || busy) return;
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/admin/gdrive/import", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileIds: [...sel].slice(0, BATCH), minTier: tier }),
      });
      const d = await res.json();
      if (!res.ok) { setMsg("Import failed: " + (d.error ?? "error")); return; }
      setMsg(`Imported ${d.imported} file${d.imported === 1 ? "" : "s"}${d.failed?.length ? ` · ${d.failed.length} failed` : ""}.`);
      setSel(new Set());
      load();
    } catch { setMsg("Import failed — try again."); }
    finally { setBusy(false); }
  }

  if (loading) return <p className="text-sm text-neutral-500">Checking Google Drive connection…</p>;

  if (!configured) {
    return (
      <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
        <p className="font-medium text-amber-400">Google Drive isn&apos;t connected yet.</p>
        <p className="mt-2">To enable batch importing from Drive, a one-time setup is needed:</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-neutral-400">
          <li>In Google Cloud Console, create a project and enable the <span className="text-neutral-200">Google Drive API</span>.</li>
          <li>Create a <span className="text-neutral-200">Service Account</span> and download its JSON key.</li>
          <li>Share your content Drive folder with the service account&apos;s email (Viewer).</li>
          <li>Add two secrets in Replit: <span className="font-mono text-neutral-200">GOOGLE_SERVICE_ACCOUNT_JSON</span> (the key) and <span className="font-mono text-neutral-200">GDRIVE_FOLDER_ID</span> (the folder ID from its URL), then republish.</li>
        </ol>
        <button onClick={load} className="mt-3 rounded-md border border-neutral-700 px-3 py-1.5 text-xs hover:border-amber-500">Re-check connection</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {err && <p className="text-xs text-red-400">Drive error: {err}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-neutral-400">{files.length} file{files.length === 1 ? "" : "s"} across {groups.length} folder{groups.length === 1 ? "" : "s"} · {sel.size} selected</span>
        <label className="text-xs text-neutral-400">Tier:
          <select value={tier} onChange={(e) => setTier(e.target.value)} className="ml-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-100">
            <option value="the_gallery">The Gallery</option>
            <option value="private_world">Private World</option>
            <option value="all_access">All Access</option>
          </select>
        </label>
        <button onClick={importSel} disabled={sel.size === 0 || busy} className="rounded-md bg-amber-500 px-4 py-1.5 text-xs font-medium text-black hover:bg-amber-400 disabled:opacity-40">
          {busy ? "Importing…" : `Import ${Math.min(sel.size, BATCH)} selected`}
        </button>
        {sel.size > BATCH && <span className="text-[11px] text-neutral-500">imports {BATCH} at a time</span>}
        {msg && <span className="text-xs text-amber-400">{msg}</span>}
      </div>

      <div className="max-h-[28rem] space-y-4 overflow-y-auto pr-1">
        {groups.map(([name, gfiles]) => {
          const ids = gfiles.map((f) => f.id);
          const allOn = ids.every((id) => sel.has(id));
          return (
            <div key={name}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-amber-400/90">{name.trim() || "Top level"} <span className="font-normal text-neutral-500">· {gfiles.length}</span></span>
                <button onClick={() => toggleGroup(ids, allOn)} className="text-[11px] text-neutral-400 underline underline-offset-2 hover:text-amber-400">
                  {allOn ? "Clear folder" : "Select all"}
                </button>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {gfiles.map((f) => {
                  const isVideo = f.mimeType.startsWith("video/");
                  const checked = sel.has(f.id);
                  return (
                    <label key={f.id} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2 ${checked ? "border-amber-500/50 bg-amber-500/10" : "border-neutral-800 bg-neutral-900 hover:border-neutral-700"}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggle(f.id)} className="h-4 w-4 accent-amber-500" />
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-neutral-950 text-neutral-400">{isVideo ? "▶" : "▣"}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm text-neutral-200">{f.name}</span><span className="text-[11px] text-neutral-500">{isVideo ? "Video" : "Photo"}</span></span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {files.length === 0 && <p className="text-sm text-neutral-500">No image/video files found in the shared Drive folder or its subfolders.</p>}
    </div>
  );
}
