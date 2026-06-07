"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CREATOR } from "@/config/creator";

interface Message {
  role: "fan" | "ai";
  content: string;
}

export function ChatView({
  initialMessages,
  initialConversationId,
  tier,
}: {
  initialMessages: Message[];
  initialConversationId: string | null;
  tier: string;
}) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [paywall, setPaywall] = useState<null | "subscribe_or_topup" | "topup">(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function send() {
    const message = draft.trim();
    if (!message || sending) return;
    setDraft("");
    setError(null);
    setSending(true);
    setMessages((m) => [...m, { role: "fan", content: message }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, conversationId }),
      });
      const data = await res.json();

      if (res.status === 402) {
        setMessages((m) => m.slice(0, -1));
        setDraft(message);
        setPaywall(data.reason ?? "subscribe_or_topup");
        return;
      }
      if (!res.ok) {
        setMessages((m) => m.slice(0, -1));
        setDraft(message);
        setError("Message didn't send — nothing was charged. Try again.");
        return;
      }
      setConversationId(data.conversationId);
      setMessages((m) => [...m, { role: "ai", content: data.reply }]);
    } catch {
      setMessages((m) => m.slice(0, -1));
      setDraft(message);
      setError("Connection hiccup. Try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-ink text-fg">
      {/* Header with persistent AI badge (legal requirement — do not remove) */}
      <header className="flex items-center justify-between border-b border-line bg-panel px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-accent">
            ✦
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{CREATOR.aiName}</p>
            <p className="text-xs text-mute leading-tight">{CREATOR.aiTagline}</p>
          </div>
          <span className="ml-1 rounded-md border border-accent/50 bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-accent">
            AI
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="rounded-full border border-line px-2.5 py-1 capitalize text-mute">{tier}</span>
          <Link href="/pricing" className="text-mute hover:text-accent transition">Upgrade</Link>
        </div>
      </header>

      {/* Thread */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-6">
        {messages.length === 0 && (
          <div className="mx-auto mt-16 max-w-sm text-center text-sm text-mute">
            <p className="text-2xl">✦</p>
            <p className="mt-4">
              Say hi. I&rsquo;m {CREATOR.aiName} — trained by her, always online.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "fan" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "fan"
                  ? "bg-accent text-[#14060c] rounded-br-sm"
                  : "bg-panel-2 border border-line rounded-bl-sm"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border border-line bg-panel-2 px-4 py-2.5 text-sm text-mute">
              <span className="animate-pulse">typing…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="px-4 pb-2 text-center text-xs text-red-400">{error}</p>}

      {/* Composer */}
      <div className="border-t border-line bg-panel p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${CREATOR.aiName}…`}
            maxLength={2000}
            className="flex-1 rounded-full border border-line bg-panel-2 px-5 py-3 text-sm outline-none placeholder:text-mute focus:border-accent transition"
          />
          <button type="submit" disabled={sending || !draft.trim()} className="btn-primary !px-6">
            Send
          </button>
        </form>
        <p className="mt-2 text-center text-[10px] text-mute">
          You are chatting with an AI companion, not a real person. 18+.
        </p>
      </div>

      {/* Paywall modal */}
      {paywall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-sm rounded-2xl border border-line bg-panel p-6 text-center">
            <p className="text-2xl">✦</p>
            <h2 className="mt-3 text-lg font-semibold">
              {paywall === "subscribe_or_topup" ? "Don't stop now…" : "Out of messages for today"}
            </h2>
            <p className="mt-2 text-sm text-mute">
              {paywall === "subscribe_or_topup"
                ? "Your free messages are spent. Join a plan for daily conversation, or grab credits that never expire."
                : "You've used today's allowance. Top up with credits that never expire — or upgrade your plan."}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link href="/pricing" className="btn-primary w-full">
                {paywall === "subscribe_or_topup" ? "See plans" : "Top up credits"}
              </Link>
              <button onClick={() => setPaywall(null)} className="btn-ghost w-full">
                Not now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
