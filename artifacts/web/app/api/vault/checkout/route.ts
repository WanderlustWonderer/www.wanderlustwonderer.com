import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getStripe } from "@/lib/companion/stripe";
import { getAppUrl } from "@/lib/app-url";
import { weeksPricePence, MAX_WEEKS_PER_ORDER, BULK_MIN_WEEKS } from "@/lib/content/store";

export const runtime = "nodejs";

/** POST { kind: 'vault_full' } or { kind:'block', periodKey } — buy Vault access. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  let body: { kind?: string; periodKey?: number; weekKeys?: number[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }

  const admin = createAdminClient();
  await admin.from("profiles").upsert({ id: user.id, email: user.email }, { onConflict: "id" });

  const stripe = getStripe();
  const appUrl = getAppUrl(req);
  const base = {
    mode: "payment" as const,
    client_reference_id: user.id,
    customer_email: user.email ?? undefined,
    success_url: `${appUrl}/portal?vault=1`,
    cancel_url: `${appUrl}/portal/vault`,
  };

  if (body.kind === "vault_full") {
    const session = await stripe.checkout.sessions.create({
      ...base,
      line_items: [{ price_data: { currency: "gbp", unit_amount: 88800, product_data: { name: "The Vault — last 12 weeks of content" } }, quantity: 1 }],
      metadata: { vault: "1", scope: "vault_full", user_id: user.id },
    });
    return NextResponse.json({ url: session.url });
  }
  if (body.kind === "block" && typeof body.periodKey === "number") {
    const session = await stripe.checkout.sessions.create({
      ...base,
      line_items: [{ price_data: { currency: "gbp", unit_amount: 35000, product_data: { name: "The Vault — 4-week block" } }, quantity: 1 }],
      metadata: { vault: "1", scope: "block", period_key: String(body.periodKey), user_id: user.id },
    });
    return NextResponse.json({ url: session.url });
  }
  if (body.kind === "weeks" && Array.isArray(body.weekKeys)) {
    const keys = [...new Set(body.weekKeys.filter((k) => Number.isInteger(k)))].slice(0, MAX_WEEKS_PER_ORDER);
    if (keys.length === 0) return NextResponse.json({ error: "no_weeks" }, { status: 400 });
    const amount = weeksPricePence(keys.length);
    const discounted = keys.length >= BULK_MIN_WEEKS;
    const session = await stripe.checkout.sessions.create({
      ...base,
      line_items: [{ price_data: { currency: "gbp", unit_amount: amount, product_data: { name: `The Vault — ${keys.length} week${keys.length > 1 ? "s" : ""} of content${discounted ? " (20% off)" : ""}` } }, quantity: 1 }],
      metadata: { vault: "1", scope: "weeks", week_keys: keys.join(","), user_id: user.id },
    });
    return NextResponse.json({ url: session.url });
  }
  return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
}
