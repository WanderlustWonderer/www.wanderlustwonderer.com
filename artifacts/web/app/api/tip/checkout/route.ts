import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { createClient } from "@/utils/supabase/server";
import { getAppUrl } from "@/lib/app-url";

export const runtime = "nodejs";

/** POST { amountPence } — one-off "tip the Muse" Stripe checkout (£1–£500). */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  let body: { amountPence?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const pence = Math.round(Number(body.amountPence));
  if (!Number.isFinite(pence) || pence < 100 || pence > 50000) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  const appUrl = getAppUrl(req);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    line_items: [{
      price_data: { currency: "gbp", unit_amount: pence, product_data: { name: "A tip for the Muse 💝" } },
      quantity: 1,
    }],
    success_url: `${appUrl}/chat?tip=thanks`,
    cancel_url: `${appUrl}/chat`,
    metadata: { tip: "1", user_id: user.id },
  });
  return NextResponse.json({ url: session.url });
}
