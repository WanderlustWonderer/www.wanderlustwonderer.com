import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { ensureCompanionProfile } from "@/lib/companion/profile";
import { decideEntitlement } from "@/lib/companion/entitlements";
import { buildSystemPrompt, selectHistory, type HistoryMessage } from "@/lib/companion/prompt";
import { generateReply } from "@/lib/companion/llm";

export const runtime = "nodejs";

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
  if (!message || message.length > 2000) {
    return NextResponse.json({ error: "invalid_message" }, { status: 400 });
  }

  const admin = createAdminClient();
  const profile = await ensureCompanionProfile(
    admin,
    user.id,
    (user.user_metadata?.display_name as string) ?? user.email?.split("@")[0],
    (user.user_metadata?.age_confirmed_at as string) ?? null
  );

  // --- Entitlement: daily allowance → credits → 402 ---
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const [{ count: usedToday }, { data: balanceData }] = await Promise.all([
    admin
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", user.id)
      .eq("role", "fan")
      .gte("created_at", todayStart.toISOString()),
    admin.rpc("companion_credit_balance", { p: user.id }),
  ]);
  const creditBalance = Number(balanceData ?? 0);

  const decision = decideEntitlement({
    tier: profile.tier,
    usedToday: usedToday ?? 0,
    creditBalance,
  });

  if (!decision.allow) {
    return NextResponse.json(
      { error: "payment_required", reason: decision.reason, creditBalance },
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
    if (error) return NextResponse.json({ error: "conversation_failed" }, { status: 500 });
    conversationId = conv.id;
  }

  // --- History for memory ---
  const { data: priorMessages } = await admin
    .from("chat_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(200);
  const history = selectHistory((priorMessages ?? []) as HistoryMessage[], profile.tier);

  // --- Persist fan message + spend credit if needed ---
  const { data: fanMsg, error: fanError } = await admin
    .from("chat_messages")
    .insert({ conversation_id: conversationId, profile_id: user.id, role: "fan", content: message })
    .select("id")
    .single();
  if (fanError) return NextResponse.json({ error: "persist_failed" }, { status: 500 });

  let creditSpent = false;
  if (decision.via === "credit") {
    await admin.from("credit_ledger").insert({
      profile_id: user.id,
      delta: -1,
      reason: "message",
    });
    creditSpent = true;
  }

  // --- LLM call with refund-on-failure ---
  let reply: string;
  try {
    reply = await generateReply(buildSystemPrompt(profile.memory_summary), history, message);
  } catch (err) {
    console.error("LLM failure:", err);
    if (creditSpent) {
      await admin.from("credit_ledger").insert({
        profile_id: user.id,
        delta: 1,
        reason: "auto_refund",
      });
    }
    await admin.from("chat_messages").delete().eq("id", fanMsg.id);
    return NextResponse.json({ error: "llm_failed" }, { status: 502 });
  }

  await admin.from("chat_messages").insert({
    conversation_id: conversationId,
    profile_id: user.id,
    role: "ai",
    content: reply,
  });

  return NextResponse.json({
    reply,
    conversationId,
    entitlement:
      decision.via === "allowance"
        ? { via: "allowance", remaining: decision.remainingAllowance, creditBalance }
        : { via: "credit", remaining: 0, creditBalance: decision.creditBalanceAfter },
  });
}
