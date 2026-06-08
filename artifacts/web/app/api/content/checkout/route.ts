import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getStripe } from "@/lib/companion/stripe";

export const runtime = "nodejs";

/** POST { messageId } — fan pays to unlock a locked media message. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  let body: { messageId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  if (!body.messageId) return NextResponse.json({ error: "missing_message" }, { status: 400 });

  const admin = createAdminClient();
  const { data: msg } = await admin
    .from("chat_messages")
    .select("id, profile_id, kind, media_kind, price_pence, locked, caption")
    .eq("id", body.messageId)
    .maybeSingle();
  if (!msg || msg.profile_id !== user.id || msg.kind !== "media" || !msg.locked || !msg.price_pence) {
    return NextResponse.json({ error: "unavailable" }, { status: 409 });
  }

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    line_items: [{
      price_data: {
        currency: "gbp",
        unit_amount: msg.price_pence,
        product_data: { name: msg.media_kind === "video" ? "Private video" : "Private photo" },
      },
      quantity: 1,
    }],
    success_url: `${appUrl}/chat?unlocked=1`,
    cancel_url: `${appUrl}/chat`,
    metadata: { content_unlock: "1", message_id: msg.id, user_id: user.id },
  });
  return NextResponse.json({ url: session.url });
}
