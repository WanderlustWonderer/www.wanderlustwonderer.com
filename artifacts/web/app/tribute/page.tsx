import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export default function TributePage() {
  return (
    <div className="bg-black text-neutral-100 min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-center text-3xl font-semibold tracking-[0.15em] uppercase">
          The Tribute &amp; The Toll
        </h1>
        <p className="mt-2 text-center text-sm tracking-[0.3em] uppercase text-amber-400/90">
          Where Words End and Devotion Begins.
        </p>
        <div className="mt-12 space-y-6 leading-relaxed text-neutral-300">
          <p>
            <strong className="text-neutral-100">The Essence:</strong> To admire a Muse is
            a given; to be acknowledged by one requires action. This space is not a store.
            It is not a subscription. This is an altar for pure financial devotion and a
            place to pay for your missteps.
          </p>
          <p>
            Whether you are here to offer a Token of Worship or to settle a mandatory
            Audacity Tax, choose your offering in The Collection.
          </p>
          <p>
            If my presence has captivated you, leave your offering. If you have
            overstepped your bounds, pay your toll.
          </p>
        </div>
        <div className="mt-12 text-center">
          <Link href="/collection" className="inline-block rounded-full bg-amber-500 px-10 py-4 text-sm font-medium tracking-[0.2em] text-black hover:bg-amber-400 transition">
            RECOGNISE MY WORTH
          </Link>
        </div>
        <div className="mt-16 rounded-2xl border border-neutral-800 p-8 text-center">
          <h2 className="text-lg font-semibold">For Crypto Tributes</h2>
          <p className="mt-3 text-sm text-neutral-400">
            I accept direct devotion via Solana (SOL). Send your tribute directly to my
            wallet below.
          </p>
          <p className="mt-4 text-xs tracking-[0.2em] text-neutral-400">@WanderlustWndr</p>
          <code className="mt-3 block break-all rounded-lg bg-neutral-900 px-4 py-3 text-sm text-amber-400">
            AWejVaRKnJKwkKafCMBoPwkukDQxSXeGvS5zL8M5UShg
          </code>
          <p className="mt-3 text-xs italic text-neutral-500">(Copy and send with silence)</p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
