import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { ensureCompanionProfile } from "@/lib/companion/profile";
import { spendCredit, refundCredit, balances } from "@/lib/wallet/ledger";
import { buildDraftPrompt, selectHistory, type HistoryMessage, type ViewerInfo } from "@/lib/companion/prompt";
import { generateReply } from "@/lib/companion/llm";

export const runtime = "nodejs";
export const MAX_MESSAGE_CHARS = 250;

/**
 * Fan sends a private message to the creator.
 * - Costs 1 credit to send (spam control + support).
 * - The message is delivered to the creator's inbox; it is NOT auto-answered.
 * - An AI *draft* reply is generated for the creator to review/edit/send.
 *   The fan never sees the draft — only replies the creator approves and sends.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  let body: { message?: string; conversationId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const message = (body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "invalid_message" }, { status: 400 });
  if (message.length > MAX_MESSAGE_CHARS) return NextResponse.json({ error: "too_long", max: MAX_MESSAGE_CHARS }, { status: 400 });

  const admin = createAdminClient();
  const profile = await ensureCompanionProfile(
    admin, user.id,
    (user.user_metadata?.display_name as string) ?? user.email?.split("@")[0],
    (user.user_metadata?.age_confirmed_at as string) ?? null
  );

  // 1 credit to send a message.
  const spent = await spendCredit(admin, user.id);
  if (!spent) return NextResponse.json({ error: "payment_required", reason: "topup" }, { status: 402 });

  // Conversation
  let conversationId = body.conversationId ?? null;
  if (conversationId) {
    const { data: conv } = await admin.from("conversations").select("id").eq("id", conversationId).eq("profile_id", user.id).maybeSingle();
    if (!conv) conversationId = null;
  }
  if (!conversationId) {
    const { data: conv, error } = await admin.from("conversations").insert({ profile_id: user.id, creator_id: profile.creator_id }).select("id").single();
    if (error) {
      await refundCredit(admin, user.id, spent);
      return NextResponse.json({ error: "conversation_failed" }, { status: 500 });
    }
    conversationId = conv.id;
  }

  // Store the fan's message (delivered to the creator's inbox).
  const { error: fanErr } = await admin.from("chat_messages").insert({
    conversation_id: conversationId, profile_id: user.id, role: "fan", content: message, status: "sent", kind: "text",
  });
  if (fanErr) {
    await refundCredit(admin, user.id, spent);
    return NextResponse.json({ error: "persist_failed" }, { status: 500 });
  }

  // Generate an AI DRAFT reply for the creator to review (best-effort; never shown to the fan).
  try {
    const { data: prior } = await admin
      .from("chat_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .eq("status", "sent")
      .order("created_at", { ascending: true })
      .limit(200);
    const history = selectHistory((prior ?? []) as HistoryMessage[]);
    // Who is this fan? (free guest vs paying member, and which tier) — powers the upsell.
    const { data: prof } = await admin
      .from("profiles")
      .select("membership_tier, subscription_status")
      .eq("id", user.id)
      .maybeSingle();
    const isMember = !!prof?.subscription_status && ["active", "trialing"].includes(prof.subscription_status as string);
    const viewer: ViewerInfo = { tier: isMember ? ((prof?.membership_tier as ViewerInfo["tier"]) ?? null) : null };
    const draft = await generateReply(buildDraftPrompt(profile.memory_summary, viewer), history, message);
    await admin.from("chat_messages").insert({
      conversation_id: conversationId, profile_id: user.id, role: "ai", content: draft, status: "draft", kind: "text",
    });
  } catch (err) {
    console.error("Draft generation failed (non-fatal):", err);
  }

  const b = await balances(admin, user.id);
  return NextResponse.json({ ok: true, balance: b.total, conversationId });
}
