import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getStripe } from "@/lib/companion/stripe";

export const runtime = "nodejs";

/**
 * POST /api/booking/checkout  { slotId }
 * Creates a one-off Stripe Checkout for the slot's session product.
 * The slot is only locked on webhook payment success (pay-locks-the-slot),
 * claimed atomically so two buyers can never take the same slot.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  let body: { slotId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!body.slotId) return NextResponse.json({ error: "missing_slot" }, { status: 400 });

  const admin = createAdminClient();
  const { data: slot } = await admin
    .from("availability_slots")
    .select("id, product_id, starts_at, status")
    .eq("id", body.slotId)
    .maybeSingle();
  if (!slot || slot.status !== "open" || new Date(slot.starts_at) <= new Date()) {
    return NextResponse.json({ error: "slot_unavailable" }, { status: 409 });
  }

  const { data: product } = await admin
    .from("products")
    .select("id, name, stripe_price_id, active, product_type")
    .eq("id", slot.product_id)
    .maybeSingle();
  if (!product?.active || product.product_type !== "booking" || !product.stripe_price_id) {
    return NextResponse.json({ error: "product_unavailable" }, { status: 404 });
  }

  // Ensure the membership profiles row exists (FK target for bookings).
  await admin.from("profiles").upsert({ id: user.id, email: user.email }, { onConflict: "id" });

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    line_items: [{ price: product.stripe_price_id, quantity: 1 }],
    success_url: `${appUrl}/account?booking=success`,
    cancel_url: `${appUrl}/book`,
    metadata: { booking: "1", slot_id: slot.id, product_id: product.id, user_id: user.id },
  });

  return NextResponse.json({ url: session.url });
}
