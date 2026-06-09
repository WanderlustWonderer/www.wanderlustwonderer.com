import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { ensureWebImage } from "@/lib/server/heic";

export const runtime = "nodejs";

/** POST multipart: displayName, bio, avatar(file optional) — member edits their own profile. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const form = await req.formData();
  const displayName = String(form.get("displayName") ?? "").slice(0, 60).trim();
  const bio = String(form.get("bio") ?? "").slice(0, 500).trim();
  const file = form.get("avatar") as File | null;

  const admin = createAdminClient();
  const update: Record<string, string | null> = {
    display_name: displayName || null,
    bio: bio || null,
  };

  if (file && file.size > 0) {
    if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "too_large" }, { status: 413 });
    let buffer = Buffer.from(await file.arrayBuffer());
    let ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    let contentType = file.type || "image/jpeg";
    const conv = await ensureWebImage(file, buffer);
    buffer = conv.buffer; ext = conv.ext; contentType = conv.contentType;
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await admin.storage.from("avatars").upload(path, buffer, { contentType, upsert: true });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
    const { data: pub } = admin.storage.from("avatars").getPublicUrl(path);
    // cache-bust so the new image shows immediately
    update.avatar_url = `${pub.publicUrl}?v=${Date.now()}`;
  }

  const { error } = await admin.from("profiles").update(update).eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, avatar_url: update.avatar_url ?? null });
}
