import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAdmin } from "@/lib/admin/guard";

export const runtime = "nodejs";

/**
 * POST multipart: file, conversationId, kind(photo|video), pricePence, caption
 * Uploads to the private chat-media bucket and posts a LOCKED media message
 * into the fan's thread (admin only). Fan unlocks by paying.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "forbidden" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const conversationId = String(form.get("conversationId") ?? "");
  const kind = String(form.get("kind") ?? "photo");
  const pricePence = Number(form.get("pricePence") ?? 0);
  const caption = String(form.get("caption") ?? "");
  if (!file || !conversationId || !["photo", "video"].includes(kind) || pricePence <= 0) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: conv } = await admin.from("conversations").select("id, profile_id").eq("id", conversationId).maybeSingle();
  if (!conv) return NextResponse.json({ error: "no_conversation" }, { status: 404 });

  const ext = (file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg")).toLowerCase();
  const path = `${conv.profile_id}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await admin.storage.from("chat-media").upload(path, buffer, {
    contentType: file.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
    upsert: false,
  });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  await admin.from("chat_messages").insert({
    conversation_id: conv.id, profile_id: conv.profile_id, role: "creator",
    content: caption || (kind === "video" ? "A little video for you 🎬" : "A photo, just for you 📸"),
    caption, status: "sent", kind: "media", media_kind: kind, media_path: path,
    price_pence: pricePence, locked: true,
  });

  return NextResponse.json({ ok: true });
}
