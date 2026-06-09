import Link from "next/link";
import { CREATOR } from "@/config/creator";
import { EmailCapture } from "@/components/companion/EmailCapture";
import { TeaserWall } from "@/components/teaser-wall";

export default function LandingPage() {
  return (
    <div className="min-h-screen text-fg">
      {/* Nav */}
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
          <span className="text-sm font-semibold tracking-[0.2em] uppercase">
            {CREATOR.displayName}
          </span>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/pricing" className="text-mute hover:text-fg transition">Pricing</Link>
            <Link href="/login" className="text-mute hover:text-fg transition">Sign in</Link>
            <Link href="/chat" className="btn-primary !px-5 !py-2">Start chatting</Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-6 pt-24 pb-16 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-1.5 text-xs text-mute">
            <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
            {CREATOR.aiName} — {CREATOR.aiTagline}
          </span>
          <h1 className="mt-8 text-4xl font-semibold leading-tight tracking-tight md:text-6xl">
            Talk to me.
            <br />
            <span className="text-accent">Any hour. Any mood.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-mute">
            I trained my own AI on my voice, my world, my energy — so the
            conversation never has to stop. Flirty, funny, always awake. Openly
            AI, unmistakably me.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href="/chat" className="btn-primary glow">
              Start chatting free
            </Link>
            <Link href="/pricing" className="btn-ghost">
              See plans
            </Link>
          </div>
          <p className="mt-4 text-xs text-mute">
            3 free credits on signup. No card required.
          </p>
        </section>

        {/* Teaser strip */}
        <section className="border-y border-line bg-panel">
          <div className="mx-auto grid max-w-5xl gap-4 px-6 py-12 md:grid-cols-3">
            {[
              { q: "“good morning… tell me where you'd take me first in Bali”", a: "Barefoot to the rice terraces before the world wakes up. Then I'd decide if you've earned breakfast. 🌅" },
              { q: "“I had the worst day”", a: "Then stop. Breathe in for four with me. I'm not going anywhere — tell me everything." },
              { q: "“are you actually real?”", a: "I'm her AI — trained by her, in her voice. The mystery is real; the disclosure is too. ✨" },
            ].map((t) => (
              <div key={t.q} className="rounded-2xl border border-line bg-panel-2 p-5">
                <p className="text-sm text-mute">{t.q}</p>
                <p className="mt-3 text-sm text-fg">{t.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tiers preview */}
        <section className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-center text-2xl font-semibold">Closer, on your terms</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { name: "The Gallery", price: "£55/mo", blurb: "5 free chat credits monthly + weekly exclusive content." },
              { name: "Private World", price: "£100/mo", blurb: "8 free chat credits monthly + behind-the-lens sanctuary.", featured: true },
              { name: "All Access", price: "£250/mo", blurb: "15 free chat credits monthly + the full unfiltered story." },
            ].map((tier) => (
              <div key={tier.name} className={`rounded-2xl border p-6 ${tier.featured ? "border-accent/60 glow" : "border-line"} bg-panel`}>
                <h3 className="font-semibold">{tier.name}</h3>
                <p className="mt-1 text-2xl font-semibold">{tier.price}</p>
                <p className="mt-2 text-sm text-mute">{tier.blurb}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/pricing" className="btn-ghost">Full pricing →</Link>
          </div>
        </section>

        <TeaserWall />

        {/* Email capture */}
        <section className="border-t border-line bg-panel">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-6 py-16 text-center">
            <h2 className="text-xl font-semibold">New drops, voice notes, surprises</h2>
            <p className="text-sm text-mute">Be first to know what the Muse builds next.</p>
            <EmailCapture />
          </div>
        </section>
      </main>

      {/* Footer with required disclosures */}
      <footer className="border-t border-line">
        <div className="mx-auto max-w-5xl space-y-4 px-6 py-12 text-center text-xs text-mute">
          <p className="font-medium text-fg">
            18+ only. {CREATOR.aiName} is an artificial intelligence companion —
            not a real person. All conversations are with AI.
          </p>
          <p>
            © 2026 {CREATOR.displayName} · <Link href="/terms" className="underline hover:text-fg">Terms</Link> ·{" "}
            <Link href="/privacy" className="underline hover:text-fg">Privacy</Link>
          </p>
          <p>
            <a href={CREATOR.socials.instagram} className="hover:text-fg">Instagram</a> ·{" "}
            <a href={CREATOR.socials.tiktok} className="hover:text-fg">TikTok</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
