import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { CREATOR } from "@/config/creator";
import { isValidStart } from "@/lib/booking/availability";

export const runtime = "nodejs";

function inferDuration(name: string): number {
  const n = name.toLowerCase();
  if (n.includes("eclipse") || n.includes("2-hour") || n.includes("two")) return 120;
  if (n.includes("hour")) return 60;
  if (n.includes("30") || n.includes("frequency") || n.includes("first")) return 30;
  return 60;
}

/**
 * POST /api/booking/schedule { bookingId, startIso }
 * Schedules a paid, unscheduled booking onto a default-availability time the
 * member chose. A booked slot is created (unique per time) so no double-booking.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  let body: { bookingId?: string; startIso?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  if (!body.bookingId || !body.startIso) return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  if (!isValidStart(body.startIso)) return NextResponse.json({ error: "slot_unavailable" }, { status: 409 });
  const startIso = new Date(body.startIso).toISOString();

  const admin = createAdminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, user_id, product_id, scheduled_at, products(name)")
    .eq("id", body.bookingId)
    .maybeSingle();
  if (!booking || booking.user_id !== user.id || booking.scheduled_at) {
    return NextResponse.json({ error: "booking_invalid" }, { status: 409 });
  }

  const { data: creator } = await admin.from("creators").select("id").eq("slug", CREATOR.slug).single();
  if (!creator) return NextResponse.json({ error: "no_creator" }, { status: 400 });

  const name = (booking as unknown as { products?: { name?: string } }).products?.name ?? "Session";
  // Create the booked slot — unique index on (starts_at where booked) prevents collisions.
  const { error: slotErr } = await admin.from("availability_slots").insert({
    creator_id: creator.id, product_id: booking.product_id, starts_at: startIso,
    duration_min: inferDuration(name), status: "booked", booking_id: booking.id,
  });
  if (slotErr) {
    if (slotErr.code === "23505") return NextResponse.json({ error: "slot_taken" }, { status: 409 });
    return NextResponse.json({ error: slotErr.message }, { status: 500 });
  }

  await admin.from("bookings").update({ scheduled_at: startIso, status: "scheduled" }).eq("id", booking.id);
  return NextResponse.json({ ok: true, scheduledAt: startIso });
}
