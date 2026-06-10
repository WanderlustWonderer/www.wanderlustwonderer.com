import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAdmin, isAal2 } from "@/lib/admin/guard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "forbidden" }, { status: 404 });
  if (!(await isAal2(supabase))) return NextResponse.json({ error: "forbidden" }, { status: 404 });
  let body: { profileId?: string; notes?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad" }, { status: 400 }); }
  if (!body.profileId) return NextResponse.json({ error: "missing" }, { status: 400 });
  const admin = createAdminClient();
  const notes = typeof body.notes === "string" ? body.notes.slice(0, 5000) : null;
  const { error } = await admin.from("profiles").update({ admin_notes: notes }).eq("id", body.profileId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
