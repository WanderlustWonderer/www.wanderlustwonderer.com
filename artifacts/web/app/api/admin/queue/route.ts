import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAdmin } from "@/lib/admin/guard";
import { ensureWebImage } from "@/lib/server/heic";

export const runtime = "nodejs";

/**
 * Shared content queue (library). Items added here can be dripped to ANY fan,
 * but each fan only ever receives a given item once (see /api/content/queue-next).
 *
 * POST multipart: file, kind(photo|video), pricePence, caption  — add one item.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "forbidden" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const kind = String(form.get("kind") ?? "photo");
  const pricePence = Number(form.get("pricePence") ?? 0);
  const caption = String(form.get("caption") ?? "");
  if (!file || !["photo", "video"].includes(kind) || pricePence <= 0) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  let buffer = Buffer.from(await file.arrayBuffer());
  let ext = (file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg")).toLowerCase();
  let contentType = file.type || (kind === "video" ? "video/mp4" : "image/jpeg");
  if (kind !== "video") {
    const conv = await ensureWebImage(file, buffer);
    buffer = conv.buffer; ext = conv.ext; contentType = conv.contentType;
  }
  // Library files live under a shared prefix (not per-fan) so one upload serves everyone.
  const path = `library/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await admin.storage.from("chat-media").upload(path, buffer, { contentType, upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  // Append to the end of the queue.
  const { data: last } = await admin.from("media_queue").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
  const position = (last?.position ?? 0) + 1;

  const { data: row, error } = await admin.from("media_queue").insert({
    kind, media_path: path, caption, price_pence: Math.round(pricePence), position, active: true,
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: row.id });
}

/** DELETE ?id= — soft-deactivate a library item (keeps already-delivered messages working). */
export async function DELETE(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "forbidden" }, { status: 404 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const admin = createAdminClient();
  await admin.from("media_queue").update({ active: false }).eq("id", id);
  return NextResponse.json({ ok: true });
}
