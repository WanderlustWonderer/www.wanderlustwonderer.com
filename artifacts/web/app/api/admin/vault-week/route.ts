import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAdmin } from "@/lib/admin/guard";

export const runtime = "nodejs";

/** POST { weekKey, title } — admin titles a Vault week ("Week 6 — All content from the Car Wash"). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "forbidden" }, { status: 404 });

  let body: { weekKey?: number; title?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  if (typeof body.weekKey !== "number") return NextResponse.json({ error: "missing_week" }, { status: 400 });

  const admin = createAdminClient();
  await admin.from("vault_weeks").upsert(
    { week_key: body.weekKey, title: (body.title ?? "").slice(0, 120).trim() || null, updated_at: new Date().toISOString() },
    { onConflict: "week_key" }
  );
  return NextResponse.json({ ok: true });
}
