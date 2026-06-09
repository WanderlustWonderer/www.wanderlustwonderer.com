import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { SOL_RECIPIENT, solGbpPrice, newReference, solanaPayUrl } from "@/lib/server/solana";

export const runtime = "nodejs";

const TIER_PENCE: Record<string, number> = { the_gallery: 5500, private_world: 10000, all_access: 25000 };
const TIER_NAME: Record<string, string> = { the_gallery: "The Gallery", private_world: "Private World", all_access: "All Access" };
const QUOTE_MINUTES = 15;

/** POST { tier } — start a crypto (SOL) membership payment: price it, reserve a reference. */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  let body: { tier?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const tier = body.tier ?? "";
  if (!TIER_PENCE[tier]) return NextResponse.json({ error: "invalid_tier" }, { status: 400 });

  let price: number;
  try { price = await solGbpPrice(); } catch { return NextResponse.json({ error: "price_unavailable" }, { status: 503 }); }

  const gbpPence = TIER_PENCE[tier];
  // Round the SOL amount UP to 4 dp so a member never underpays from rounding.
  const solAmount = Math.ceil((gbpPence / 100 / price) * 10000) / 10000;
  const reference = newReference();
  const expiresAt = new Date(Date.now() + QUOTE_MINUTES * 60000).toISOString();

  const admin = createAdminClient();
  const { error } = await admin.from("crypto_payments").insert({
    profile_id: user.id, tier, reference, recipient: SOL_RECIPIENT,
    gbp_pence: gbpPence, sol_amount: solAmount, status: "pending", expires_at: expiresAt,
  });
  if (error) return NextResponse.json({ error: "quote_failed" }, { status: 500 });

  const payUrl = solanaPayUrl(solAmount, reference, "Wanderlust Wonderer", `${TIER_NAME[tier]} membership · 30 days`);
  return NextResponse.json({ reference, solAmount, recipient: SOL_RECIPIENT, gbpPence, payUrl, expiresAt, tier, tierName: TIER_NAME[tier] });
}
