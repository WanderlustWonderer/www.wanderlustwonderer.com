"use client";

import { useState } from "react";
import { toUploadable } from "@/components/heic-convert";

interface Msg { id: string; role: string; content: string; kind: string; status: string; media_kind?: string | null; locked?: boolean; price_pence?: number | null; }
interface Conv { id: string; email: string; messages: Msg[]; latestDraftId: string | null; latestDraft: string | null; }

export function AdminInbox({ conversations }: { conversations: Conv[] }) {
  if (conversations.length === 0) return <p className="text-sm text-neutral-500">No conversations yet.</p>;
  return (
    <div className="space-y-3">
      {conversations.map((c) => <Thread key={c.id} conv={c} />)}
    </div>
  );
}

function Thread({ conv }: { conv: Conv }) {
  const [reply, setReply] = useState(conv.latestDraft ?? "");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState("photo");
  const [price, setPrice] = useState(10);
  const [caption, setCaption] = useState("");
  const pendingFan = conv.messages.filter((m) => m.role === "fan").length;

  async function sendReply() {
    if (!reply.trim()) return;
    setBusy(true);
    await fetch("/api/admin/messages/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: conv.id, content: reply.trim(), draftId: conv.latestDraftId }) });
    window.location.reload();
  }
  async function sendMedia() {
    if (!file || price <= 0) return;
    setBusy(true);
    let prepared: File;
    try { prepared = await toUploadable(file); }
    catch (e) { alert(e instanceof Error ? e.message : "Could not prepare the file."); setBusy(false); return; }
    const fd = new FormData();
    fd.append("file", prepared); fd.append("conversationId", conv.id); fd.append("kind", kind);
    fd.append("pricePence", String(Math.round(price * 100))); fd.append("caption", caption);
    await fetch("/api/admin/content", { method: "POST", body: fd });
    window.location.reload();
  }

  return (
    <details className="rounded-xl border border-neutral-800 bg-neutral-900">
      <summary className="cursor-pointer px-4 py-3 text-sm">
        <span className="font-medium">{conv.email}</span>
        <span className="ml-3 text-neutral-500">{conv.messages.length} messages</span>
        {conv.latestDraft && <span className="ml-3 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">draft ready</span>}
      </summary>
      <div className="space-y-3 border-t border-neutral-800 px-4 py-3">
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {conv.messages.map((m) => (
            <div key={m.id} className={m.role === "fan" ? "text-right" : "text-left"}>
              <span className={`inline-block max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.role === "fan" ? "bg-amber-500/20" : "bg-neutral-800"}`}>
                {m.kind === "media" ? `[${m.media_kind} · ${m.locked ? "locked £" + ((m.price_pence ?? 0) / 100).toFixed(2) : "unlocked"}] ${m.content}` : m.content}
              </span>
            </div>
          ))}
        </div>

        <div>
          <label className="text-xs text-neutral-400">Your reply{conv.latestDraft ? " (AI draft — edit freely)" : ""}</label>
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2}
            className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100" placeholder="Write your message…" />
          <button onClick={sendReply} disabled={busy || !reply.trim()} className="mt-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-black hover:bg-amber-400 disabled:opacity-40">Send reply</button>
        </div>

        <div className="rounded-lg border border-neutral-800 p-3">
          <p className="mb-2 text-xs font-medium text-neutral-300">Send a paid photo/video</p>
          <div className="flex flex-wrap items-end gap-2">
            <input type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs text-neutral-300" />
            <select value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-100">
              <option value="photo">Photo</option><option value="video">Video</option>
            </select>
            <label className="text-xs text-neutral-400">£<input type="number" value={price} min={1} step={1} onChange={(e) => setPrice(Number(e.target.value))} className="ml-1 w-16 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-100" /></label>
            <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="caption (optional)" className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-100" />
            <button onClick={sendMedia} disabled={busy || !file} className="rounded-md border border-neutral-600 px-3 py-1 text-xs hover:border-amber-500 hover:text-amber-400 disabled:opacity-40">Send</button>
          </div>
        </div>
      </div>
    </details>
  );
}
