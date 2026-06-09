import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

/** GET — lightweight viewer status for client UI (lead-capture popup). */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ authed: false, member: false });
  const admin = createAdminClient();
  const { data: p } = await admin.from("profiles").select("subscription_status").eq("id", user.id).maybeSingle();
  const member = !!p?.subscription_status && ["active", "trialing"].includes(p.subscription_status);
  return NextResponse.json({ authed: true, member });
}
