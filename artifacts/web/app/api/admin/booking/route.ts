import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isAdmin } from "@/lib/admin/guard";

export const runtime = "nodejs";

/** POST { bookingId, meetingUrl } — attach the Teams/meeting link (admin only). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "forbidden" }, { status: 404 });
  let body: { bookingId?: string; meetingUrl?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  if (!body.bookingId) return NextResponse.json({ error: "missing_booking" }, { status: 400 });
  const admin = createAdminClient();
  await admin.from("bookings").update({ meeting_url: body.meetingUrl ?? null }).eq("id", body.bookingId);
  return NextResponse.json({ ok: true });
}
