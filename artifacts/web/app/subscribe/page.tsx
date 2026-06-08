import Link from "next/link";
import { createClient, createAdminClient } from "@/utils/supabase/server";
import { reconcileLegacyMember } from "@/lib/stripe/reconcile";
import { BuyButton } from "@/components/buy-button";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const dynamic = "force-dynamic";

const TIERS = [
  {
    key: "the_gallery",
    image: "https://i0.wp.com/wanderlustwonderer.com/wp-content/uploads/2026/04/WhatsApp-Image-2026-04-04-at-17.46.25.jpeg?resize=880%2C1024&ssl=1",
    name: "The Gallery",
    subtitle: "The Lunar Rhythm",
    tagline: "The Heartbeat of the Journey",
    price: "£55",
    essence:
      "The foundational rhythm of the Wanderlust Wonderer. Once a week, sync your frequency with exclusive, pre-recorded yoga journeys designed to ground even the most restless of spirits.",
    features: [
      "Member Entry: your official pass into the community",
      "Weekly Yoga: exclusive pre-recorded flows to ground your week",
      "Soul Alignment: intentional rituals to sync your energy with the Muse",
      "Private Flow Library: unlimited access to the curated collection",
    ],
    cta: "JOIN THE CIRCLE",
  },
  {
    key: "private_world",
    image: "https://i0.wp.com/wanderlustwonderer.com/wp-content/uploads/2026/04/IMG_2114.jpg?resize=683%2C1024&ssl=1",
    name: "Private World",
    subtitle: "The Venusian Mirror",
    tagline: "The Sanctuary of Beauty and Devotion",
    price: "£100",
    essence:
      "This is where the public gaze ends and private devotion begins. Step through the looking glass into a sanctuary of beauty and behind-the-scenes truth.",
    features: [
      "Everything in The Gallery",
      "Exclusive BTS: real, behind-the-lens looks at my life",
      "Personal Rituals: a private window into daily yoga and self-care",
      "Premium Content: high-vibration imagery hidden from socials",
    ],
    cta: "ENTER MY WORLD",
    featured: true,
  },
  {
    key: "all_access",
    image: "https://i0.wp.com/wanderlustwonderer.com/wp-content/uploads/2026/04/IMG_2448.jpg?resize=819%2C1024&ssl=1",
    name: "All Access",
    subtitle: "The Solar Experience",
    tagline: "The Full Eclipse",
    price: "£250",
    essence:
      "The Sun of my brand — unfiltered, raw, and totally direct. The complete, unrestricted story of who I am and how I live, delivered with total transparency.",
    features: [
      "The Full Story: the unedited Director's Cut — no chapters missing",
      "The Complete Universe: includes The Gallery and Private World",
      "Direct 1:1 Messaging: an open line for personal connection",
      "Total Transparency: raw, unfiltered, zero restrictions",
    ],
    cta: "GO UNFILTERED",
  },
] as const;

export default async function SubscribePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isMember = false;
  let tierName: string | null = null;

  if (user) {
    const admin = createAdminClient();
    let { data: profile } = await admin
      .from("profiles")
      .select("membership_tier, subscription_status, stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.stripe_customer_id) {
      const linked = await reconcileLegacyMember(user.id, user.email);
      if (linked) {
        const { data } = await admin
          .from("profiles")
          .select("membership_tier, subscription_status, stripe_customer_id")
          .eq("id", user.id)
          .maybeSingle();
        profile = data;
      }
    }

    isMember =
      !!profile?.subscription_status &&
      ["active", "trialing"].includes(profile.subscription_status);
    tierName = profile?.membership_tier ?? null;
  }

  return (
    <div className="bg-black text-neutral-100 min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-semibold tracking-[0.1em] uppercase">Members Club</h1>
          <p className="mt-3 text-lg italic text-amber-400/90">Choose Your Path</p>
        </header>

        {isMember && (
          <div className="mb-10 rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 text-center">
            <p className="font-medium">
              You are already a member{tierName ? ` — ${tierName.replace(/_/g, " ")}` : ""}.
            </p>
            <a href="/api/stripe/portal" className="mt-1 inline-block underline">
              Manage your subscription
            </a>
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.key}
              className={`relative flex flex-col overflow-hidden rounded-2xl border p-8 ${
                "featured" in tier && tier.featured
                  ? "border-amber-500/60 shadow-lg shadow-amber-500/10"
                  : "border-neutral-700"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={tier.image} alt="" aria-hidden className="pointer-events-none absolute inset-0 h-full w-full object-cover object-top opacity-35" />
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-black/55" />
              <div className="relative z-10 flex flex-1 flex-col">
              <h2 className="text-xl font-semibold">{tier.name}</h2>
              <p className="text-sm text-amber-400/90">{tier.subtitle}</p>
              <p className="mt-1 text-sm italic opacity-60">{tier.tagline}</p>
              <p className="mt-6 text-4xl font-semibold">
                {tier.price}
                <span className="text-base font-normal opacity-60"> / month</span>
              </p>
              <p className="mt-4 text-sm leading-relaxed text-neutral-300">{tier.essence}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-neutral-300">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span aria-hidden className="text-amber-400">✔</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                {user ? (
                  <BuyButton
                    payload={{ tier: tier.key }}
                    label={tier.cta}
                    featured={!!("featured" in tier && tier.featured)}
                    disabled={isMember}
                  />
                ) : (
                  <Link
                    href="/signup"
                    className={`block w-full rounded-full px-6 py-3 text-center text-sm font-medium transition ${
                      "featured" in tier && tier.featured
                        ? "bg-amber-500 text-black hover:bg-amber-400"
                        : "border border-neutral-500 hover:border-amber-500 hover:text-amber-500"
                    }`}
                  >
                    {tier.cta}
                  </Link>
                )}
              </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs opacity-50">
          Payments are processed securely by Stripe. Cancel any time from your account.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
