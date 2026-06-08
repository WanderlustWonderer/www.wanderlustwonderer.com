import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAdmin } from "@/lib/admin/guard";

export const runtime = "nodejs";

/** POST { conversationId, content, draftId? } — Muse sends an approved text reply (admin only). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "forbidden" }, { status: 404 });

  let body: { conversationId?: string; content?: string; draftId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const content = (body.content ?? "").trim();
  if (!body.conversationId || !content) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const admin = createAdminClient();
  const { data: conv } = await admin.from("conversations").select("id, profile_id").eq("id", body.conversationId).maybeSingle();
  if (!conv) return NextResponse.json({ error: "no_conversation" }, { status: 404 });

  await admin.from("chat_messages").insert({
    conversation_id: conv.id, profile_id: conv.profile_id, role: "creator", content, status: "sent", kind: "text",
  });
  // Clear the draft it came from, if any.
  if (body.draftId) await admin.from("chat_messages").delete().eq("id", body.draftId).eq("status", "draft");

  return NextResponse.json({ ok: true });
}
