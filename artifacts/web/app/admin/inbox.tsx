"use client";

import { useState, useEffect, useRef } from "react";
import { toUploadable } from "@/components/heic-convert";

function threadSlug(email: string): string { return (email || "").toLowerCase().replace(/[^a-z0-9]+/g, "-"); }

interface Msg { id: string; role: string; content: string; kind: string; status: string; media_kind?: string | null; locked?: boolean; price_pence?: number | null; created_at?: string; read_at?: string | null; }
interface Conv {
  id: string; email: string; messages: Msg[];
  latestDraftId: string | null; latestDraft: string | null;
  needsReply?: boolean; oldestUnansweredAt?: string | null;
  queue?: { photoUnlocked: number; videoUnlocked: number; photoRemaining: number; videoRemaining: number };
}

function waitingSince(iso: string | null | undefined): string {
  if (!iso) return "";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m waiting`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h waiting`;
  return `${Math.round(hrs / 24)}d waiting`;
}

/** WhatsApp-style receipts on the creator's own messages: 1 grey tick = delivered, 2 blue ticks = read by the fan. */
function Ticks({ read }: { read: boolean }) {
  return (
    <span
      title={read ? "Read" : "Delivered"}
      aria-label={read ? "Read" : "Delivered"}
      className={`ml-1 inline-flex select-none align-middle text-[11px] leading-none ${read ? "text-sky-400" : "text-neutral-500"}`}
    >
      {read ? "\u2713\u2713" : "\u2713"}
    </span>
  );
}

export function AdminInbox({ newMessages, allThreads }: { newMessages: Conv[]; allThreads: Conv[] }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-400">
          New messages
          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs">{newMessages.length}</span>
          <span className="text-xs font-normal text-neutral-500">· oldest first</span>
        </h3>
        {newMessages.length === 0 ? (
          <p className="text-sm text-neutral-500">All caught up — nothing waiting for a reply.</p>
        ) : (
          <div className="space-y-3">
            {newMessages.map((c) => <Thread key={`new-${c.id}`} conv={c} defaultOpen highlight />)}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-neutral-400">All conversations ({allThreads.length})</h3>
        {allThreads.length === 0 ? (
          <p className="text-sm text-neutral-500">No conversations yet.</p>
        ) : (
          <div className="space-y-3">
            {allThreads.map((c) => <Thread key={`all-${c.id}`} conv={c} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function Thread({ conv, defaultOpen = false, highlight = false }: { conv: Conv; defaultOpen?: boolean; highlight?: boolean }) {
  const [reply, setReply] = useState(conv.latestDraft ?? "");
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState("photo");
  const [price, setPrice] = useState(10);
  const [caption, setCaption] = useState("");
  const ref = useRef<HTMLDetailsElement>(null);
  const slug = threadSlug(conv.email);
  useEffect(() => {
    function check() {
      if (typeof window !== "undefined" && window.location.hash === `#thread-${slug}`) {
        if (ref.current) { ref.current.open = true; ref.current.scrollIntoView({ behavior: "smooth", block: "start" }); }
      }
    }
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, [slug]);

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
    <details ref={ref} id={`thread-${slug}`} open={defaultOpen} className={`scroll-mt-24 rounded-xl border bg-neutral-900 ${highlight ? "border-amber-500/40" : "border-neutral-800"}`}>
      <summary className="cursor-pointer px-4 py-3 text-sm">
        <span className="font-medium">{conv.email}</span>
        <span className="ml-3 text-neutral-500">{conv.messages.length} messages</span>
        {conv.latestDraft && <span className="ml-3 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-400">draft ready</span>}
        {conv.needsReply && conv.oldestUnansweredAt && (
          <span className="ml-3 rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-400">{waitingSince(conv.oldestUnansweredAt)}</span>
        )}
      </summary>
      <div className="space-y-3 border-t border-neutral-800 px-4 py-3">
        {conv.queue && (conv.queue.photoUnlocked + conv.queue.videoUnlocked + conv.queue.photoRemaining + conv.queue.videoRemaining > 0) && (
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-neutral-300">
              Queue bought: {conv.queue.photoUnlocked} photo{conv.queue.photoUnlocked === 1 ? "" : "s"} · {conv.queue.videoUnlocked} video{conv.queue.videoUnlocked === 1 ? "" : "s"}
            </span>
            <span className="rounded-full border border-neutral-700 px-2.5 py-1 text-neutral-500">
              {conv.queue.photoRemaining} photo{conv.queue.photoRemaining === 1 ? "" : "s"} · {conv.queue.videoRemaining} video{conv.queue.videoRemaining === 1 ? "" : "s"} left for them
            </span>
          </div>
        )}
        <div className="max-h-72 space-y-2 overflow-y-auto">
          {conv.messages.map((m) => (
            <div key={m.id} className={m.role === "fan" ? "text-right" : "text-left"}>
              <span className={`inline-block max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.role === "fan" ? "bg-amber-500/20" : "bg-neutral-800"}`}>
                {m.kind === "media" ? `[${m.media_kind} · ${m.locked ? "locked £" + ((m.price_pence ?? 0) / 100).toFixed(2) : "unlocked"}] ${m.content}` : m.content}
                {m.role !== "fan" && <Ticks read={!!m.read_at} />}
              </span>
            </div>
          ))}
        </div>

        <div>
          <label className="text-xs text-neutral-400">Your reply{conv.latestDraft ? " (Draft — edit freely)" : ""}</label>
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
