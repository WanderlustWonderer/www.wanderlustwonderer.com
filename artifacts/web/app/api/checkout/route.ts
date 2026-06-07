import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { ensureCompanionProfile } from "@/lib/companion/profile";
import { getStripe, priceIdForTier, priceIdForPack } from "@/lib/companion/stripe";
import type { TierKey } from "@/config/creator";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  let body: { kind?: "subscription" | "credits"; key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const admin = createAdminClient();
  const profile = await ensureCompanionProfile(admin, user.id, user.email?.split("@")[0]);
  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  const common = {
    client_reference_id: user.id,
    ...(profile.stripe_customer_id
      ? { customer: profile.stripe_customer_id }
      : { customer_email: user.email ?? undefined }),
    success_url: `${appUrl}/chat?status=success`,
    cancel_url: `${appUrl}/pricing`,
    metadata: { companion: "1", profile_id: user.id },
  };

  if (body.kind === "subscription") {
    const tier = body.key as TierKey;
    const price = priceIdForTier(tier);
    if (!price) return NextResponse.json({ error: "unknown_tier" }, { status: 400 });
    const session = await stripe.checkout.sessions.create({
      ...common,
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      subscription_data: { metadata: { companion: "1", profile_id: user.id } },
    });
    return NextResponse.json({ url: session.url });
  }

  if (body.kind === "credits") {
    const price = priceIdForPack(body.key as "small" | "large");
    if (!price) return NextResponse.json({ error: "unknown_pack" }, { status: 400 });
    const session = await stripe.checkout.sessions.create({
      ...common,
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
    });
    return NextResponse.json({ url: session.url });
  }

  return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
}
