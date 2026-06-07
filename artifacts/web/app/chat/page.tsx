import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { ChatView } from "@/components/companion/ChatView";
import { balances } from "@/lib/wallet/ledger";
import { CREATOR } from "@/config/creator";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-ink px-6 text-center text-fg">
        <span className="rounded-full border border-line bg-panel px-4 py-1.5 text-xs text-mute">
          {CREATOR.aiName} — {CREATOR.aiTagline}
        </span>
        <h1 className="mt-6 text-3xl font-semibold">One step from the conversation</h1>
        <p className="mt-3 max-w-sm text-sm text-mute">
          Create a free account and get 10 messages on the house. 18+ only — and
          yes, it&rsquo;s openly an AI.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/signup" className="btn-primary">Create free account</Link>
          <Link href="/login" className="btn-ghost">Sign in</Link>
        </div>
      </main>
    );
  }

  // Resume latest conversation if one exists.
  const admin = createAdminClient();
  const [walletBalances, { data: conversation }] = await Promise.all([
    balances(admin, user.id),
    admin
      .from("conversations")
      .select("id")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  let initialMessages: { role: "fan" | "ai"; content: string }[] = [];
  if (conversation) {
    const { data } = await admin
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(200);
    initialMessages = (data ?? []) as { role: "fan" | "ai"; content: string }[];
  }

  return (
    <ChatView
      initialMessages={initialMessages}
      initialConversationId={conversation?.id ?? null}
      initialBalance={walletBalances.total}
    />
  );
}
