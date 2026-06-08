import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

/** GET ?conversationId= — sent messages for the signed-in fan, with signed URLs for unlocked media. */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("conversationId");
  if (!conversationId) return NextResponse.json({ messages: [] });

  const admin = createAdminClient();
  const { data: conv } = await admin.from("conversations").select("id").eq("id", conversationId).eq("profile_id", user.id).maybeSingle();
  if (!conv) return NextResponse.json({ messages: [] });

  const { data } = await admin
    .from("chat_messages")
    .select("id, role, content, kind, media_kind, media_path, locked, price_pence, caption")
    .eq("conversation_id", conversationId)
    .eq("status", "sent")
    .order("created_at", { ascending: true })
    .limit(300);

  const messages = await Promise.all((data ?? []).map(async (m: any) => {
    let signedUrl: string | null = null;
    if (m.kind === "media" && !m.locked && m.media_path) {
      const { data: signed } = await admin.storage.from("chat-media").createSignedUrl(m.media_path, 600);
      signedUrl = signed?.signedUrl ?? null;
    }
    return { id: m.id, role: m.role, content: m.content, kind: m.kind, media_kind: m.media_kind, locked: m.locked, price_pence: m.price_pence, caption: m.caption, signedUrl };
  }));
  return NextResponse.json({ messages });
}
