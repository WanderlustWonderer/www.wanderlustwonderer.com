import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getStripe } from "@/lib/companion/stripe";
import { getAppUrl, appRedirectUrl } from "@/lib/app-url";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(appRedirectUrl(req, "/login"));

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("companion_profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.stripe_customer_id) {
    return NextResponse.redirect(appRedirectUrl(req, "/pricing"));
  }

  const appUrl = getAppUrl(req);
  const session = await getStripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl}/chat`,
  });
  return NextResponse.redirect(session.url);
}
