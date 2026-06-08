import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { ensureCompanionProfile } from "@/lib/companion/profile";
import { spendCredit, refundCredit, balances } from "@/lib/wallet/ledger";
import { buildSystemPrompt, selectHistory, type HistoryMessage } from "@/lib/companion/prompt";
import { generateReply } from "@/lib/companion/llm";

export const runtime = "nodejs";

export const MAX_MESSAGE_CHARS = 250;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  let body: { message?: string; conversationId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const message = (body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "invalid_message" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_CHARS) {
    return NextResponse.json({ error: "too_long", max: MAX_MESSAGE_CHARS }, { status: 400 });
  }

  const admin = createAdminClient();
  const profile = await ensureCompanionProfile(
    admin,
    user.id,
    (user.user_metadata?.display_name as string) ?? user.email?.split("@")[0],
    (user.user_metadata?.age_confirmed_at as string) ?? null
  );

  // --- Credits: 1 message = 1 credit, expiring (subscription) pot first ---
  const spentPot = await spendCredit(admin, user.id);
  if (!spentPot) {
    return NextResponse.json(
      { error: "payment_required", reason: "topup" },
      { status: 402 }
    );
  }

  // --- Conversation ---
  let conversationId = body.conversationId ?? null;
  if (conversationId) {
    const { data: conv } = await admin
      .from("conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("profile_id", user.id)
      .maybeSingle();
    if (!conv) conversationId = null;
  }
  if (!conversationId) {
    const { data: conv, error } = await admin
      .from("conversations")
      .insert({ profile_id: user.id, creator_id: profile.creator_id })
      .select("id")
      .single();
    if (error) {
      await refundCredit(admin, user.id, spentPot);
      return NextResponse.json({ error: "conversation_failed" }, { status: 500 });
    }
    conversationId = conv.id;
  }

  const { data: priorMessages } = await admin
    .from("chat_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);
  const history = selectHistory((priorMessages ?? []) as HistoryMessage[]);

  const { data: fanMsg, error: fanError } = await admin
    .from("chat_messages")
    .insert({ conversation_id: conversationId, profile_id: user.id, role: "fan", content: message })
    .select("id")
    .single();
  if (fanError) {
    await refundCredit(admin, user.id, spentPot);
    return NextResponse.json({ error: "persist_failed" }, { status: 500 });
  }

  // --- LLM call with refund-on-failure ---
  let reply: string;
  try {
    reply = await generateReply(buildSystemPrompt(profile.memory_summary), history, message);
  } catch (err) {
    console.error("LLM failure:", err);
    await refundCredit(admin, user.id, spentPot);
    await admin.from("chat_messages").delete().eq("id", fanMsg.id);
    return NextResponse.json(
      { error: "llm_failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }

  await admin.from("chat_messages").insert({
    conversation_id: conversationId,
    profile_id: user.id,
    role: "ai",
    content: reply,
  });

  const b = await balances(admin, user.id);
  return NextResponse.json({ reply, conversationId, balance: b.total });
}
