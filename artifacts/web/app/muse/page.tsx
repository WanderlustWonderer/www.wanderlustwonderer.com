import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "The Muse",
  description: "The manifesto. Not an influencer — a Muse. Mystery, magic and movement, on her terms.",
};

export default function MusePage() {
  return (
    <div className="text-neutral-100 min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-center text-3xl font-semibold tracking-[0.15em] uppercase">
          The Architect. The Muse.
        </h1>
        <p className="mt-2 text-center text-sm tracking-[0.3em] uppercase text-amber-400/90">
          The Manifesto
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          <img src="https://i0.wp.com/wanderlustwonderer.com/wp-content/uploads/2026/04/IMG_2231-829x1024.jpg?ssl=1" alt="The Muse" className="rounded-2xl border border-neutral-800" />
          <img src="https://i0.wp.com/wanderlustwonderer.com/wp-content/uploads/2026/04/IMG_2127.jpg?ssl=1" alt="The Muse" className="rounded-2xl border border-neutral-800" />
        </div>
        <div className="mt-12 space-y-6 text-lg leading-relaxed text-neutral-300">
          <p>Do not confuse me with an influencer or a content creator. I am a Muse.</p>
          <p>
            I travel where I please, I create what I desire and I exist in a constant
            state of high-vibration luxury. My life is an ongoing masterpiece of movement,
            magic and aesthetic.
          </p>
          <p>
            I built this platform because my energy is too valuable to be consumed for
            free on standard social media. Here, the boundaries are absolute. I set the
            pace, I curate the atmosphere and I dictate the rules. I allow a select,
            financially devoted few to fund my lifestyle and witness my reality.
          </p>
          <p>
            I do not explain my value. I do not negotiate my worth. You either recognize
            the privilege of my presence, or you stay on the outside.
          </p>
          <p className="font-semibold text-neutral-100">Here, we don&rsquo;t chase. We attract.</p>
        </div>
        <div className="mt-12 text-center">
          <Link href="/subscribe" className="inline-block rounded-full bg-amber-500 px-10 py-4 text-sm font-medium tracking-[0.2em] text-black hover:bg-amber-400 transition">
            JOIN THE JOURNEY
          </Link>
          <p className="mt-8 italic text-neutral-400">
            Wanderlust Wonderer — <span className="text-amber-400">Unfiltered. Unrestricted.</span>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
