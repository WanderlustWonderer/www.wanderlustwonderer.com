import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isAdmin } from "@/lib/admin/guard";
import { gdriveConfigured, listDriveFiles } from "@/lib/server/gdrive";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "forbidden" }, { status: 404 });

  if (!gdriveConfigured()) return NextResponse.json({ configured: false, files: [] });
  try {
    const files = await listDriveFiles();
    return NextResponse.json({ configured: true, files });
  } catch (e) {
    return NextResponse.json({ configured: true, files: [], error: e instanceof Error ? e.message : "list_failed" }, { status: 200 });
  }
}
