import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getStripe } from "@/lib/companion/stripe";
import { VAULT_FULL_PRICE, VAULT_BLOCK_PRICE } from "@/lib/content/store";

export const runtime = "nodejs";

/** POST { kind: 'vault_full' } or { kind:'block', periodKey } — buy Vault access. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  let body: { kind?: string; periodKey?: number };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }

  const admin = createAdminClient();
  await admin.from("profiles").upsert({ id: user.id, email: user.email }, { onConflict: "id" });

  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
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
      line_items: [{ price: VAULT_FULL_PRICE, quantity: 1 }],
      metadata: { vault: "1", scope: "vault_full", user_id: user.id },
    });
    return NextResponse.json({ url: session.url });
  }
  if (body.kind === "block" && typeof body.periodKey === "number") {
    const session = await stripe.checkout.sessions.create({
      ...base,
      line_items: [{ price: VAULT_BLOCK_PRICE, quantity: 1 }],
      metadata: { vault: "1", scope: "block", period_key: String(body.periodKey), user_id: user.id },
    });
    return NextResponse.json({ url: session.url });
  }
  return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
}
