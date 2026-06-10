import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAdmin, isAal2 } from "@/lib/admin/guard";
import { ensureWebImage } from "@/lib/server/heic";
import { downloadDriveFile, gdriveConfigured, listDriveFiles } from "@/lib/server/gdrive";

export const runtime = "nodejs";
export const maxDuration = 300;

function baseName(name: string) { return name.replace(/\.[^./\\]+$/, "").trim() || "Untitled"; }

/**
 * POST { fileIds, target?: "content"|"queue", minTier?, photoPence?, videoPence? }
 * Import selected Drive files either as tiered portal content (default) or into the shared content queue.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "forbidden" }, { status: 404 });
  if (!(await isAal2(supabase))) return NextResponse.json({ error: "forbidden" }, { status: 404 });
  if (!gdriveConfigured()) return NextResponse.json({ error: "not_configured" }, { status: 400 });

  let body: { fileIds?: string[]; target?: string; minTier?: string; photoPence?: number; videoPence?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const requested = (body.fileIds ?? []).filter((s) => typeof s === "string").slice(0, 25);
  if (requested.length === 0) return NextResponse.json({ error: "no_files" }, { status: 400 });

  // Scope: only files actually under the configured GDRIVE_FOLDER_ID may be
  // imported — never an arbitrary Drive file the service account can read.
  const allowed = new Set((await listDriveFiles()).map((f) => f.id));
  const fileIds = requested.filter((id) => allowed.has(id));
  if (fileIds.length === 0) return NextResponse.json({ error: "no_files_in_folder" }, { status: 400 });

  const target = body.target === "queue" ? "queue" : "content";
  const minTier = ["the_gallery", "private_world", "all_access"].includes(body.minTier ?? "") ? body.minTier! : "the_gallery";
  const photoPence = Number(body.photoPence) > 0 ? Math.round(Number(body.photoPence)) : 1000;
  const videoPence = Number(body.videoPence) > 0 ? Math.round(Number(body.videoPence)) : 2500;

  const admin = createAdminClient();
  let imported = 0;
  const failed: string[] = [];

  let nextPos = 0;
  if (target === "queue") {
    const { data: last } = await admin.from("media_queue").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
    nextPos = (last?.position ?? 0) + 1;
  }

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

      if (target === "queue") {
        const path = `library/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await admin.storage.from("chat-media").upload(path, buf, { contentType: ct, upsert: false });
        if (upErr) { failed.push(name); continue; }
        const { error: qErr } = await admin.from("media_queue").insert({
          kind: isVideo ? "video" : "photo", media_path: path, caption: baseName(name),
          price_pence: isVideo ? videoPence : photoPence, position: nextPos, active: true,
        });
        if (qErr) { failed.push(name); continue; }
        nextPos++; imported++;
        continue;
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
