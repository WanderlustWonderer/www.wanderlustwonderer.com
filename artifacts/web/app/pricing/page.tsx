import Link from "next/link";
import { CREATOR, TIERS, CREDIT_PACKS } from "@/config/creator";
import { CheckoutButton } from "@/components/companion/CheckoutButton";

export const dynamic = "force-dynamic";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-ink text-fg">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-sm font-semibold tracking-[0.2em] uppercase">
            {CREATOR.displayName}
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/chat" className="text-mute hover:text-fg transition">Chat</Link>
            <a href="/api/portal" className="text-mute hover:text-fg transition">Manage billing</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-center text-3xl font-semibold">Choose how close you want to be</h1>
        <p className="mx-auto mt-3 max-w-md text-center text-sm text-mute">
          Every plan talks to {CREATOR.aiName} — openly AI, trained by the Muse
          herself. Cancel anytime.
        </p>

        {/* Subscriptions */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {(["fan", "vip", "inner"] as const).map((key) => {
            const tier = TIERS[key];
            const featured = key === "vip";
            return (
              <div
                key={key}
                className={`flex flex-col rounded-2xl border bg-panel p-7 ${
                  featured ? "border-accent/60 glow" : "border-line"
                }`}
              >
                {featured && (
                  <span className="mb-3 w-fit rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
                    Most popular
                  </span>
                )}
                <h2 className="text-lg font-semibold">{tier.name}</h2>
                <p className="mt-2 text-3xl font-semibold">
                  {tier.priceLabel.replace("/mo", "")}
                  <span className="text-sm font-normal text-mute">/month</span>
                </p>
                <p className="mt-2 text-sm text-mute">{tier.blurb}</p>
                <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                  {tier.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span className="text-accent">✦</span>
                      <span className="text-mute">{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-7">
                  <CheckoutButton
                    kind="subscription"
                    itemKey={key}
                    label={`Get ${tier.name}`}
                    featured={featured}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Credits */}
        <h2 className="mt-20 text-center text-xl font-semibold">Just want a top-up?</h2>
        <p className="mt-2 text-center text-sm text-mute">
          Credits never expire and work on any plan — including free.
        </p>
        <div className="mx-auto mt-8 grid max-w-2xl gap-6 sm:grid-cols-2">
          {CREDIT_PACKS.map((pack) => (
            <div key={pack.key} className="rounded-2xl border border-line bg-panel p-7 text-center">
              <p className="text-3xl font-semibold">{pack.credits}</p>
              <p className="text-sm text-mute">messages</p>
              <p className="mt-3 text-xl font-semibold">{pack.priceLabel}</p>
              <div className="mt-5">
                <CheckoutButton
                  kind="credits"
                  itemKey={pack.key}
                  label={`Buy ${pack.credits} credits`}
                  featured={pack.key === "large"}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="mt-16 text-center text-xs text-mute">
          18+ only. {CREATOR.aiName} is an AI companion, not a real person.
          Payments processed by Stripe.
        </p>
      </main>
    </div>
  );
}
