"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CREATOR } from "@/config/creator";
import { TipButton } from "@/components/tip-button";
import { createClient } from "@/utils/supabase/client";
import { ProtectedMedia } from "@/components/protected-media";
import { track } from "@/components/analytics";

export interface ChatMessage {
  id: string;
  role: "fan" | "ai" | "creator";
  content: string;
  kind: "text" | "media";
  media_kind?: "photo" | "video" | null;
  locked?: boolean;
  price_pence?: number | null;
  caption?: string | null;
  signedUrl?: string | null;
}

export interface QueueKind {
  unlocked: number;       // how many of this kind the fan has paid to unlock
  remaining: number;      // how many more they can still receive
  nextPrice: number | null; // price (pence) of the next item, if any
  canUnlock: boolean;
}
export interface QueueSummary { photo: QueueKind; video: QueueKind; }

function gbp(p: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", minimumFractionDigits: p % 100 === 0 ? 0 : 2 }).format(p / 100);
}

export function ChatView({
  initialMessages, conversationId, initialBalance, viewerLabel, queue,
}: { initialMessages: ChatMessage[]; conversationId: string | null; initialBalance: number; viewerLabel: string; queue?: QueueSummary; }) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [convId, setConvId] = useState(conversationId);
  const [balance, setBalance] = useState(initialBalance);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, justSent]);

  // Authoritative refresh from the server (brings creator replies + unlocked media signed URLs).
  async function refreshMessages(id: string) {
    try {
      const res = await fetch(`/api/chat/messages?conversationId=${id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.messages)) {
        setMessages((cur) => {
          const optimistic = cur.filter((m) => m.id.startsWith("tmp"));
          const server: ChatMessage[] = data.messages;
          const serverContents = new Set(server.map((m) => m.role + "|" + m.content));
          const keptOptimistic = optimistic.filter((m) => !serverContents.has("fan|" + m.content));
          return [...server, ...keptOptimistic];
        });
      }
    } catch { /* ignore */ }
  }

  // Live updates: Supabase Realtime for instant push (real logins) + a poll fallback.
  useEffect(() => {
    if (!convId) return;
    let active = true;
    const supabase = createClient();
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) supabase.realtime.setAuth(data.session.access_token);
    })();
    const channel = supabase
      .channel("chat:" + convId)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages", filter: "conversation_id=eq." + convId },
        () => { if (active) refreshMessages(convId); })
      .subscribe();
    const poll = setInterval(() => { if (active) refreshMessages(convId); }, 7000);
    return () => { active = false; clearInterval(poll); supabase.removeChannel(channel); };
  }, [convId]);

  async function send() {
    const message = draft.trim();
    if (!message || sending) return;
    setDraft(""); setError(null); setSending(true); setJustSent(false);
    setMessages((m) => [...m, { id: "tmp" + Date.now(), role: "fan", content: message, kind: "text" }]);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, conversationId: convId }) });
      const data = await res.json();
      if (res.status === 402) { setMessages((m) => m.slice(0, -1)); setDraft(message); setPaywall(true); return; }
      if (!res.ok) { setMessages((m) => m.slice(0, -1)); setDraft(message); setError("Couldn't send — try again."); return; }
      if (typeof data.balance === "number") setBalance(data.balance);
      if (data.conversationId) setConvId(data.conversationId);
      track("chat_message_sent");
      setJustSent(true);
    } catch { setMessages((m) => m.slice(0, -1)); setDraft(message); setError("Connection hiccup. Try again."); }
    finally { setSending(false); }
  }

  async function unlock(messageId: string) {
    try {
      const res = await fetch("/api/content/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId }) });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error();
      window.location.href = data.url;
    } catch { setError("Couldn't open checkout — try again."); }
  }

  const [unlocking, setUnlocking] = useState<"photo" | "video" | null>(null);
  async function unlockNext(kind: "photo" | "video") {
    if (unlocking) return;
    setUnlocking(kind); setError(null);
    try {
      const res = await fetch("/api/content/queue-next", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind }) });
      const data = await res.json();
      if (res.status === 409) { setError(`No more ${kind}s in the queue for you right now.`); return; }
      if (!res.ok || !data.url) throw new Error();
      window.location.href = data.url;
    } catch { setError("Couldn't open checkout — try again."); }
    finally { setUnlocking(null); }
  }

  return (
    <div className="flex h-dvh flex-col bg-ink text-fg">
      <header className="flex items-center justify-between border-b border-line bg-panel px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-accent">✦</div>
          <div>
            <p className="text-sm font-semibold leading-tight">{CREATOR.displayName}</p>
            <p className="text-xs text-mute leading-tight">Your private line to me</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="rounded-full border border-line px-2.5 py-1 text-mute">{balance} credit{balance === 1 ? "" : "s"}</span>
          <TipButton />
          <Link href="/account" className="text-mute hover:text-accent transition">Top up</Link>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <div className="mx-auto mt-16 max-w-sm text-center text-sm text-mute">
            <p className="text-2xl">✦</p>
            <p className="mt-4">This is our private space. Say something — I read every message myself. 💫</p>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.role === "fan";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${mine ? "bg-accent text-[#14060c] rounded-br-sm" : "bg-panel-2 border border-line rounded-bl-sm"}`}>
                {m.kind === "media" ? (
                  m.locked ? (
                    <div className="text-center">
                      <div className="mb-2 flex h-32 w-48 items-center justify-center rounded-xl border border-line bg-panel text-mute" style={{ filter: "blur(2px)" }}>
                        {m.media_kind === "video" ? "▶ video" : "photo"}
                      </div>
                      <p className="mb-2 text-xs">{m.caption || (m.media_kind === "video" ? "A little video for you" : "A photo, just for you")}</p>
                      <button onClick={() => unlock(m.id)} className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-[#14060c] hover:opacity-90">
                        Unlock {m.media_kind} · {gbp(m.price_pence ?? 0)}
                      </button>
                    </div>
                  ) : m.signedUrl ? (
                    <div>
                      <ProtectedMedia kind={m.media_kind ?? "photo"} url={m.signedUrl} alt={m.caption ?? "photo"} watermark={viewerLabel} />
                      {m.caption && <p className="mt-2 text-xs">{m.caption}</p>}
                    </div>
                  ) : <p>{m.content}</p>
                ) : (
                  m.content
                )}
              </div>
            </div>
          );
        })}
        {sending && <div className="flex justify-end"><div className="rounded-2xl bg-accent/40 px-4 py-2.5 text-sm">sending…</div></div>}
        {justSent && !sending && (
          <p className="text-center text-xs text-mute">Delivered — I'll reply personally as soon as I can. 💫</p>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-2 text-center text-xs text-red-400">{error}</p>}

      {queue && (queue.photo.canUnlock || queue.video.canUnlock || queue.photo.unlocked > 0 || queue.video.unlocked > 0) && (
        <div className="border-t border-line bg-panel-2/60 px-3 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {queue.photo.canUnlock && (
              <button onClick={() => unlockNext("photo")} disabled={unlocking !== null}
                className="rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-[#14060c] hover:opacity-90 disabled:opacity-50">
                {unlocking === "photo" ? "Opening…" : `Unlock next photo${queue.photo.nextPrice ? " · " + gbp(queue.photo.nextPrice) : ""}`}
              </button>
            )}
            {queue.video.canUnlock && (
              <button onClick={() => unlockNext("video")} disabled={unlocking !== null}
                className="rounded-full border border-accent/60 px-4 py-1.5 text-xs font-medium text-accent hover:bg-accent/10 disabled:opacity-50">
                {unlocking === "video" ? "Opening…" : `Unlock next video${queue.video.nextPrice ? " · " + gbp(queue.video.nextPrice) : ""}`}
              </button>
            )}
            <span className="ml-auto text-[11px] text-mute">
              {queue.photo.unlocked + queue.video.unlocked > 0 && (
                <>You&apos;ve unlocked {queue.photo.unlocked} photo{queue.photo.unlocked === 1 ? "" : "s"} &amp; {queue.video.unlocked} video{queue.video.unlocked === 1 ? "" : "s"}. </>
              )}
              {(queue.photo.remaining > 0 || queue.video.remaining > 0)
                ? `${queue.photo.remaining} more photo${queue.photo.remaining === 1 ? "" : "s"} · ${queue.video.remaining} more video${queue.video.remaining === 1 ? "" : "s"} waiting`
                : "That's everything for now 💫"}
            </span>
          </div>
        </div>
      )}

      <div className="border-t border-line bg-panel p-3">
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
          <div className="relative flex-1">
            <input value={draft} onChange={(e) => setDraft(e.target.value.slice(0, 250))} placeholder={`Message ${CREATOR.displayName}…`} maxLength={250}
              className="w-full rounded-full border border-line bg-panel-2 px-5 py-3 pr-16 text-sm outline-none placeholder:text-mute focus:border-accent transition" />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-mute">{draft.length}/250</span>
          </div>
          <button type="submit" disabled={sending || !draft.trim()} className="btn-primary !px-6">Send</button>
        </form>
        <p className="mt-2 text-center text-[10px] text-mute">Private messages to {CREATOR.displayName}. 18+. 1 credit per message. Media is watermarked and traceable to you — sharing is prohibited.</p>
      </div>

      {paywall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-panel p-6 text-center">
            <p className="text-2xl">✦</p>
            <h2 className="mt-3 text-lg font-semibold">Out of credits</h2>
            <p className="mt-2 text-sm text-mute">Top up to keep messaging me — £5 per credit or £88 for 20.</p>
            <div className="mt-6 flex flex-col gap-2">
              <Link href="/account" className="btn-primary w-full">Top up credits</Link>
              <button onClick={() => setPaywall(false)} className="btn-ghost w-full">Not now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
