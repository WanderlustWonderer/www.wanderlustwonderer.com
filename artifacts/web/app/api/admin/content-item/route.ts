import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAdmin } from "@/lib/admin/guard";

export const runtime = "nodejs";

/**
 * POST multipart: files[] (1 video OR 1+ photos), title, caption, minTier, contentType, publish
 * Creates a content item + uploads media, published live now (admin only).
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "forbidden" }, { status: 404 });

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const title = String(form.get("title") ?? "").trim();
  const caption = String(form.get("caption") ?? "");
  const minTier = String(form.get("minTier") ?? "the_gallery");
  const contentType = String(form.get("contentType") ?? "gallery");
  if (!title || files.length === 0 || !["the_gallery", "private_world", "all_access"].includes(minTier)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: item, error: itemErr } = await admin.from("content_items").insert({
    title, body: caption || null, content_type: contentType, min_tier: minTier, published_at: new Date().toISOString(),
  }).select("id").single();
  if (itemErr) return NextResponse.json({ error: itemErr.message }, { status: 500 });

  let pos = 0;
  for (const file of files) {
    const isVideo = (file.type || "").startsWith("video");
    const ext = (file.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase();
    const path = `${item.id}/${crypto.randomUUID()}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await admin.storage.from("portal-content").upload(path, buf, {
      contentType: file.type || (isVideo ? "video/mp4" : "image/jpeg"), upsert: false,
    });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    await admin.from("content_media").insert({
      content_item_id: item.id, media_kind: isVideo ? "video" : "photo", storage_path: path, position: pos++,
    });
  }

  return NextResponse.json({ ok: true, id: item.id });
}

/** DELETE { id } — remove a content item (admin only). */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "forbidden" }, { status: 404 });
  let body: { id?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const admin = createAdminClient();
  await admin.from("content_items").delete().eq("id", body.id);
  return NextResponse.json({ ok: true });
}
