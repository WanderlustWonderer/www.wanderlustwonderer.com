import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { tierRank, type MembershipTier } from "@/lib/stripe/tiers";
import { ManageMembership } from "./manage-client";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

const ALL_TIERS: MembershipTier[] = ["the_gallery", "private_world", "all_access"];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function ManagePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/account/manage");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("membership_tier, subscription_status, subscription_end_date, stripe_customer_id, stripe_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  const isMember = !!profile?.subscription_status && ["active", "trialing"].includes(profile.subscription_status as string);
  const tier = (profile?.membership_tier as MembershipTier | null) ?? null;
  if (!isMember || !tier) redirect("/subscribe");

  const rank = tierRank(tier);
  const upgradeTiers = ALL_TIERS.filter((t) => tierRank(t) > rank);
  const downgradeTiers = ALL_TIERS.filter((t) => tierRank(t) < rank);

  const benefitsLost = [
    "Your entire content library and the last 4 weeks of new posts",
    "Your monthly free chat credits",
    "Your private line to me in chat",
    "Your member achievements and the tenure streak you've built",
    "Your locked-in price — rejoining later may cost more",
  ];

  return (
    <div className="bg-black text-neutral-100 min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Manage membership</h1>
        <p className="mt-2 text-sm opacity-60">{user.email}</p>
        <div className="mt-10">
          <ManageMembership
            tier={tier}
            status={profile?.subscription_status as string}
            renewal={formatDate(profile?.subscription_end_date ?? null)}
            hasStripe={!!profile?.stripe_subscription_id || !!profile?.stripe_customer_id}
            upgradeTiers={upgradeTiers}
            downgradeTiers={downgradeTiers}
            benefitsLost={benefitsLost}
          />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
