import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAdmin, isAal2 } from "@/lib/admin/guard";

export const runtime = "nodejs";

/** POST { email, name?, stage?, notes? } — upsert a winback target's campaign stage (admin only). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "forbidden" }, { status: 404 });
  if (!(await isAal2(supabase))) return NextResponse.json({ error: "forbidden" }, { status: 404 });

  let body: { email?: string; name?: string; stage?: string; notes?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad_body" }, { status: 400 }); }
  if (!body.email) return NextResponse.json({ error: "missing_email" }, { status: 400 });

  const admin = createAdminClient();
  const row: Record<string, unknown> = { email: body.email.toLowerCase(), updated_at: new Date().toISOString() };
  if (body.name !== undefined) row.name = body.name;
  if (body.notes !== undefined) row.notes = body.notes;
  if (body.stage !== undefined) {
    row.stage = body.stage;
    if (body.stage !== "not_started") row.last_contacted_at = new Date().toISOString();
  }
  const { error } = await admin.from("winback_targets").upsert(row, { onConflict: "email" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
