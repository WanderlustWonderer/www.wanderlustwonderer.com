import Link from "next/link";
import { CREATOR, CREDIT_PACKS } from "@/config/creator";
import { CheckoutButton } from "@/components/companion/CheckoutButton";

export const metadata = {
  title: "Membership & Credits",
  description: "Choose a membership tier or top up chat credits. Three tiers from £55/mo. 18+.",
};

export const dynamic = "force-dynamic";

const MEMBERSHIPS = [
  { name: "The Gallery", price: "£55/mo", credits: 5 },
  { name: "Private World", price: "£100/mo", credits: 8 },
  { name: "All Access", price: "£250/mo", credits: 15 },
];

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
            <Link href="/account" className="text-mute hover:text-fg transition">Account</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-center text-3xl font-semibold">Credits &amp; membership</h1>
        <p className="mx-auto mt-3 max-w-md text-center text-sm text-mute">
          Every message to {CREATOR.aiName} costs 1 credit (max 250 characters).
          New accounts start with 3 free credits.
        </p>

        {/* Credit packs */}
        <div className="mx-auto mt-12 grid max-w-2xl gap-6 sm:grid-cols-2">
          {CREDIT_PACKS.map((pack) => (
            <div key={pack.key} className={`rounded-2xl border bg-panel p-7 text-center ${pack.key === "pack20" ? "border-accent/60 glow" : "border-line"}`}>
              {pack.key === "pack20" && (
                <span className="mb-2 inline-block rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
                  Best value — £4.40 per credit
                </span>
              )}
              <p className="text-3xl font-semibold">{pack.credits}</p>
              <p className="text-sm text-mute">credit{pack.credits === 1 ? "" : "s"}</p>
              <p className="mt-3 text-xl font-semibold">{pack.priceLabel}</p>
              <div className="mt-5">
                <CheckoutButton kind="credits" itemKey={pack.key} label={`Buy ${pack.credits === 1 ? "1 credit" : `${pack.credits} credits`}`} featured={pack.key === "pack20"} />
              </div>
            </div>
          ))}
        </div>

        {/* Memberships */}
        <h2 className="mt-20 text-center text-xl font-semibold">Members get free credits monthly</h2>
        <p className="mt-2 text-center text-sm text-mute">
          Plus full access to the Muse&rsquo;s exclusive world. Monthly credits refresh each billing cycle — use them or lose them.
        </p>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {MEMBERSHIPS.map((m) => (
            <div key={m.name} className="rounded-2xl border border-line bg-panel p-6 text-center">
              <h3 className="font-semibold">{m.name}</h3>
              <p className="mt-1 text-2xl font-semibold">{m.price}</p>
              <p className="mt-2 text-sm text-accent">{m.credits} free credits / month</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/subscribe" className="btn-primary">Choose your membership</Link>
        </div>

        <p className="mt-16 text-center text-xs text-mute">
          18+ only. {CREATOR.aiName} is an AI companion, not a real person. Payments processed by Stripe.
        </p>
      </main>
    </div>
  );
}
