import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAdmin } from "@/lib/admin/guard";
import { ensureWebImage } from "@/lib/server/heic";
import { downloadDriveFile, gdriveConfigured } from "@/lib/server/gdrive";

export const runtime = "nodejs";
export const maxDuration = 300;

function baseName(name: string) { return name.replace(/\.[^./\\]+$/, "").trim() || "Untitled"; }

/** POST { fileIds: string[], minTier } — import selected Drive files as content items. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "forbidden" }, { status: 404 });
  if (!gdriveConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 400 });

  let body: { fileIds?: string[]; minTier?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const fileIds = (body.fileIds ?? []).filter((s) => typeof s === "string").slice(0, 25);
  const minTier = ["the_gallery", "private_world", "all_access"].includes(body.minTier ?? "") ? body.minTier! : "the_gallery";
  if (fileIds.length === 0) return NextResponse.json({ error: "no_files" }, { status: 400 });

  const admin = createAdminClient();
  let imported = 0;
  const failed: string[] = [];

  for (const fileId of fileIds) {
    try {
      const { buffer: raw, mimeType, name } = await downloadDriveFile(fileId);
      const isVideo = mimeType.startsWith("video/");
      let buf = raw;
      let ext = (name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase();
      let ct = mimeType;
      if (!isVideo) {
        const conv = await ensureWebImage(new File([new Uint8Array(raw)], name, { type: mimeType }), buf);
        buf = conv.buffer; ext = conv.ext; ct = conv.contentType;
      }
      const { data: item, error: itemErr } = await admin.from("content_items").insert({
        title: baseName(name), body: null, content_type: isVideo ? "video" : "gallery",
        min_tier: minTier, published_at: new Date().toISOString(),
      }).select("id").single();
      if (itemErr || !item) { failed.push(name); continue; }
      const path = `${item.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await admin.storage.from("portal-content").upload(path, buf, { contentType: ct, upsert: false });
      if (upErr) { failed.push(name); continue; }
      await admin.from("content_media").insert({
        content_item_id: item.id, media_kind: isVideo ? "video" : "photo", storage_path: path, position: 0,
      });
      imported++;
    } catch {
      failed.push(fileId);
    }
  }

  return NextResponse.json({ ok: true, imported, failed });
}
