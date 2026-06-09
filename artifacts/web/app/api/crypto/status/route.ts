import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { findConfirmedPayment } from "@/lib/server/solana";

export const runtime = "nodejs";
const GRANT_DAYS = 30;

/** GET ?reference= — poll a crypto payment; on confirmation, grant 30 days of membership. */
export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "auth_required" }, { status: 401 });

  const reference = new URL(req.url).searchParams.get("reference");
  if (!reference) return NextResponse.json({ error: "missing_reference" }, { status: 400 });

  const admin = createAdminClient();
  const { data: pay } = await admin.from("crypto_payments")
    .select("id, tier, sol_amount, status, expires_at")
    .eq("reference", reference).eq("profile_id", user.id).maybeSingle();
  if (!pay) return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (pay.status === "confirmed") return NextResponse.json({ status: "confirmed" });
  if (new Date(pay.expires_at).getTime() < Date.now()) {
    await admin.from("crypto_payments").update({ status: "expired" }).eq("id", pay.id).eq("status", "pending");
    return NextResponse.json({ status: "expired" });
  }

  let sig: string | null = null;
  try { sig = await findConfirmedPayment(reference, Number(pay.sol_amount)); } catch { /* RPC hiccup → still pending */ }
  if (!sig) return NextResponse.json({ status: "pending" });

  // Confirmed on-chain — record it and grant 30 days of membership.
  await admin.from("crypto_payments").update({ status: "confirmed", tx_signature: sig, confirmed_at: new Date().toISOString() })
    .eq("id", pay.id).eq("status", "pending");
  const endDate = new Date(Date.now() + GRANT_DAYS * 86400000).toISOString();
  await admin.from("profiles").update({
    membership_tier: pay.tier, subscription_status: "active", subscription_end_date: endDate,
  }).eq("id", user.id);

  return NextResponse.json({ status: "confirmed" });
}
