import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { ChatView, type ChatMessage, type QueueSummary, type QueueKind } from "@/components/companion/ChatView";
import { balances } from "@/lib/wallet/ledger";
import { CREATOR } from "@/config/creator";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };


export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-ink px-6 text-center text-fg">
        <h1 className="mt-6 text-3xl font-semibold">A private line to {CREATOR.displayName}</h1>
        <p className="mt-3 max-w-sm text-sm text-mute">Create a free account to message me directly. 18+ only.</p>
        <div className="mt-8 flex gap-3">
          <Link href="/signup" className="btn-primary">Create free account</Link>
          <Link href="/login" className="btn-ghost">Sign in</Link>
        </div>
      </main>
    );
  }

  const admin = createAdminClient();
  const [walletBalances, { data: conversation }] = await Promise.all([
    balances(admin, user.id),
    admin.from("conversations").select("id").eq("profile_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  let initialMessages: ChatMessage[] = [];
  if (conversation) {
    // The fan is now viewing — mark the creator's sent messages as read (powers her read receipts).
    await admin
      .from("chat_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversation.id)
      .eq("status", "sent")
      .neq("role", "fan")
      .is("read_at", null);
    const { data } = await admin
      .from("chat_messages")
      .select("id, role, content, kind, media_kind, media_path, locked, price_pence, caption")
      .eq("conversation_id", conversation.id)
      .eq("status", "sent")
      .order("created_at", { ascending: true })
      .limit(300);
    initialMessages = await Promise.all(
      (data ?? []).map(async (m: any) => {
        let signedUrl: string | null = null;
        if (m.kind === "media" && !m.locked && m.media_path) {
          const { data: signed } = await admin.storage.from("chat-media").createSignedUrl(m.media_path, 600);
          signedUrl = signed?.signedUrl ?? null;
        }
        return {
          id: m.id, role: m.role, content: m.content, kind: m.kind,
          media_kind: m.media_kind, locked: m.locked, price_pence: m.price_pence, caption: m.caption, signedUrl,
        } as ChatMessage;
      })
    );
  }

  // Activation: if the fan has no history yet, the Muse opens first so they engage their free credits.
  if (initialMessages.length === 0) {
    const OPENERS = [
      "you found me \ud83d\udc40 i was just thinking about my next escape\u2026 tell me \u2014 where would you take me first? x",
      "well hello, stranger \u2728 you've got my attention. what's been on your mind today?",
      "mmm a new face \ud83d\udc40 come closer\u2026 tell me something about you i'd never guess.",
      "i don't open the door for just anyone \ud83d\ude09 but you're here now \u2014 so, what are you hoping to find behind it?",
    ];
    const opener = OPENERS[Math.floor(Math.random() * OPENERS.length)];
    initialMessages = [{ id: "opener", role: "ai", content: opener, kind: "text" } as ChatMessage];
  }

  // ---- Shared content queue (drip): per-fan availability, no item delivered twice ----
  const [{ data: queueItems }, { data: myQueueMsgs }] = await Promise.all([
    admin.from("media_queue").select("id, kind, price_pence, position").eq("active", true).order("position", { ascending: true }),
    admin.from("chat_messages").select("queue_item_id, media_kind, locked, price_pence").eq("profile_id", user.id).not("queue_item_id", "is", null),
  ]);
  const deliveredIds = new Set((myQueueMsgs ?? []).map((m: any) => m.queue_item_id));
  function kindSummary(kind: "photo" | "video"): QueueKind {
    const items = (queueItems ?? []).filter((i: any) => i.kind === kind);
    const available = items.filter((i: any) => !deliveredIds.has(i.id));
    const mine = (myQueueMsgs ?? []).filter((m: any) => m.media_kind === kind);
    const unlocked = mine.filter((m: any) => m.locked === false).length;
    const pending = mine.find((m: any) => m.locked === true) ?? null;
    const nextPrice = pending ? (pending.price_pence ?? null) : (available[0]?.price_pence ?? null);
    return { unlocked, remaining: available.length + (pending ? 1 : 0), nextPrice, canUnlock: !!pending || available.length > 0 };
  }
  const queue: QueueSummary = { photo: kindSummary("photo"), video: kindSummary("video") };

  return <ChatView initialMessages={initialMessages} conversationId={conversation?.id ?? null} initialBalance={walletBalances.total} viewerLabel={user.email ?? "you"} queue={queue} />;
}
