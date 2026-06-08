import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { claimSlot } from "@/lib/booking/slots";

export const runtime = "nodejs";

/**
 * POST /api/booking/schedule  { bookingId, slotId }
 * Schedules an UNSCHEDULED booking the member owns onto an open slot.
 * Slot is claimed atomically (open -> booked) so two members can't take it.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  let body: { bookingId?: string; slotId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  if (!body.bookingId || !body.slotId) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const admin = createAdminClient();

  // Booking must belong to the member and still be unscheduled.
  const { data: booking } = await admin
    .from("bookings")
    .select("id, user_id, product_id, scheduled_at")
    .eq("id", body.bookingId)
    .maybeSingle();
  if (!booking || booking.user_id !== user.id || booking.scheduled_at) {
    return NextResponse.json({ error: "booking_invalid" }, { status: 409 });
  }

  // Slot must match the booking's product.
  const { data: slot } = await admin
    .from("availability_slots")
    .select("id, product_id, status")
    .eq("id", body.slotId)
    .maybeSingle();
  if (!slot || slot.product_id !== booking.product_id || slot.status !== "open") {
    return NextResponse.json({ error: "slot_unavailable" }, { status: 409 });
  }

  const claimed = await claimSlot(admin, body.slotId);
  if (!claimed) return NextResponse.json({ error: "slot_taken" }, { status: 409 });

  await admin.from("bookings")
    .update({ scheduled_at: claimed.starts_at, status: "scheduled" })
    .eq("id", booking.id);
  await admin.from("availability_slots").update({ booking_id: booking.id }).eq("id", body.slotId);

  return NextResponse.json({ ok: true, scheduledAt: claimed.starts_at });
}
