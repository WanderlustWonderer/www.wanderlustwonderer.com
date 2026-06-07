import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** TEMPORARY diagnostic — reports why API routes fail in production. Remove after. */
export async function GET() {
  const out: Record<string, unknown> = {};

  out.env = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    STRIPE_PRICE_CREDIT_SINGLE: !!process.env.STRIPE_PRICE_CREDIT_SINGLE,
    STRIPE_PRICE_CREDIT_PACK20: !!process.env.STRIPE_PRICE_CREDIT_PACK20,
  };

  try {
    const mod = await import("@/utils/supabase/admin");
    const admin = mod.createAdminClient();
    const { error } = await admin.from("creators").select("id").limit(1);
    out.adminClient = error ? `QUERY_ERR: ${error.message}` : "ok";
  } catch (e) {
    out.adminClient = `THREW: ${e instanceof Error ? e.message : String(e)}`;
  }

  try {
    const mod = await import("@/lib/wallet/ledger");
    out.walletImport = typeof mod.balances === "function" ? "ok" : "missing";
  } catch (e) {
    out.walletImport = `THREW: ${e instanceof Error ? e.message : String(e)}`;
  }

  try {
    const mod = await import("@/lib/companion/stripe");
    mod.getStripe();
    out.stripe = "ok";
  } catch (e) {
    out.stripe = `THREW: ${e instanceof Error ? e.message : String(e)}`;
  }

  return NextResponse.json(out);
}
