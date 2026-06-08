import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getStripe } from "@/lib/companion/stripe";

export const runtime = "nodejs";

/**
 * POST /api/booking/checkout  { productId }
 * Buy-then-schedule: the member pays for a session product. On payment the
 * webhook creates an UNSCHEDULED booking they can then schedule against an
 * open slot. No slot is chosen here.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  let body: { productId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  if (!body.productId) return NextResponse.json({ error: "missing_product" }, { status: 400 });

  const admin = createAdminClient();
  const { data: product } = await admin
    .from("products")
    .select("id, name, stripe_price_id, active, product_type")
    .eq("id", body.productId)
    .maybeSingle();
  if (!product?.active || product.product_type !== "booking" || !product.stripe_price_id) {
    return NextResponse.json({ error: "product_unavailable" }, { status: 404 });
  }

  // bookings.user_id -> profiles.id; ensure the row exists.
  await admin.from("profiles").upsert({ id: user.id, email: user.email }, { onConflict: "id" });

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    line_items: [{ price: product.stripe_price_id, quantity: 1 }],
    success_url: `${appUrl}/book?purchased=1`,
    cancel_url: `${appUrl}/book`,
    metadata: { booking_purchase: "1", product_id: product.id, user_id: user.id },
  });
  return NextResponse.json({ url: session.url });
}
