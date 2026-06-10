import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "Meet Tasmyn Leigh — The Wanderlust Wonderer",
  description:
    "Born in South Africa, 39 countries and counting, and the cover of FHM. The story of Tasmyn Leigh — traveller, yoga instructor, model and Muse.",
};

export default function MusePage() {
  return (
    <div className="text-neutral-100 min-h-screen">
      <SiteNav />

      <main className="mx-auto max-w-3xl px-6 py-16 sm:py-24">
        {/* Hero */}
        <header className="text-center">
          <p className="text-xs sm:text-sm tracking-[0.35em] uppercase text-amber-400/90">
            As featured in FHM New Zealand
          </p>
          <h1 className="mt-5 font-display text-5xl sm:text-6xl md:text-7xl font-medium leading-[1.05]">
            Meet Tasmyn Leigh
          </h1>
          <p className="mt-4 text-sm tracking-[0.3em] uppercase text-neutral-400">
            The Wanderlust Wonderer
          </p>
        </header>

        {/* Featured FHM film */}
        <figure className="mt-14 flex flex-col items-center">
          <div className="w-full max-w-[340px] overflow-hidden rounded-[1.75rem] border border-neutral-800 shadow-2xl shadow-black/60 ring-1 ring-amber-500/10">
            <video
              className="block h-auto w-full"
              controls
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            >
              <source src="/muse-fhm.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
          <figcaption className="mt-4 text-xs tracking-[0.25em] uppercase text-neutral-500">
            From the FHM shoot
          </figcaption>
        </figure>

        {/* Editorial bio */}
        <article className="mx-auto mt-16 max-w-2xl">
          <p className="font-display text-2xl sm:text-3xl italic leading-snug text-neutral-100">
            My life has been an absolute rollercoaster of unbelievable highs,
            testing lows and everything in between.
          </p>

          <div className="mt-8 space-y-6 text-lg leading-relaxed text-neutral-300">
            <p>
              Born in South Africa and raised with a fierce, adventurous spirit, I
              discovered my passion for travel early on. Today, with{" "}
              <span className="text-neutral-100">39 countries</span> ticked off the
              map and counting, my entire world is driven by an unshakeable pursuit
              of travel, freedom and deep connection.
            </p>
            <p>
              I didn&rsquo;t arrive here by accident. I&rsquo;ve lived a dozen
              different lives: working my way up the hospitality ladder from the age
              of 15, managing high-level brand campaigns and running my own
              businesses.
            </p>
            <p>
              Walking through so many different worlds gave me my ultimate
              superpower: the ability to read human energy instantly, connect with
              people&rsquo;s hearts and make them feel truly seen.
            </p>
            <p>
              But my true transformation happened in 2026. While working five jobs
              at once, I moved into the back of my van, stripped away the noise and
              completely rebuilt myself from within.
            </p>
            <p>
              I stopped chasing success out of insecurity, reconnected with my
              ultimate childhood dreams and became entirely unapologetic about
              making them happen.
            </p>
          </div>

          {/* Pull quote */}
          <blockquote className="my-12 border-l-2 border-amber-500/70 pl-6">
            <p className="font-display text-3xl sm:text-4xl leading-tight text-neutral-100">
              The result? Stepping into my thirties completely aligned, grounded
              and landing the cover of{" "}
              <span className="text-amber-400">FHM.</span>
            </p>
          </blockquote>

          <div className="space-y-6 text-lg leading-relaxed text-neutral-300">
            <p>
              Today, as a certified yoga instructor, model and digital creator, I
              choose to meet life with an unshakeable curiosity and softness.
            </p>
          </div>

          {/* Pull quote */}
          <blockquote className="my-12 text-center">
            <p className="font-display text-2xl sm:text-3xl italic leading-snug text-amber-300/95">
              &ldquo;I&rsquo;ve learned that a woman&rsquo;s softness isn&rsquo;t her
              weakness&hellip; it is her ultimate power.&rdquo;
            </p>
          </blockquote>

          <div className="space-y-6 text-lg leading-relaxed text-neutral-300">
            <p>
              I filter every single adventure through two lenses: how does my
              8-year-old self feel about it, and how will my 80-year-old self look
              back on it? It keeps me fully present, living with zero regrets and
              trusting the magic of the unknown.
            </p>
          </div>

          <p className="mt-12 font-display text-3xl sm:text-4xl text-neutral-100">
            Welcome to my journey.
          </p>
          <p className="mt-4 text-lg italic leading-relaxed text-neutral-400">
            Stay soft, stay curious and give yourself permission to experience the
            beauty in everything.
          </p>
        </article>

        {/* Gallery */}
        <div className="mt-16 grid gap-5 sm:grid-cols-2">
          <img
            src="https://i0.wp.com/wanderlustwonderer.com/wp-content/uploads/2026/04/IMG_2231-829x1024.jpg?ssl=1"
            alt="Tasmyn Leigh"
            className="w-full rounded-2xl border border-neutral-800 object-cover"
          />
          <img
            src="https://i0.wp.com/wanderlustwonderer.com/wp-content/uploads/2026/04/IMG_2127.jpg?ssl=1"
            alt="Tasmyn Leigh"
            className="w-full rounded-2xl border border-neutral-800 object-cover"
          />
        </div>

        {/* The Muse manifesto */}
        <section className="mt-20 border-t border-neutral-800 pt-16">
          <h2 className="text-center font-display text-4xl sm:text-5xl">
            The Muse
          </h2>
          <div className="mx-auto mt-10 max-w-2xl space-y-6 text-lg leading-relaxed text-neutral-300">
            <p>
              Do not confuse me with an influencer or a content creator. I am a
              Muse.
            </p>
            <p>
              I travel where I please, I create what I desire and I exist in a
              constant state of high-vibration luxury. My life is an ongoing
              masterpiece of movement, magic and aesthetic.
            </p>
            <p>
              I built this platform because my energy is too valuable to be consumed
              for free on standard social media. Here, the boundaries are absolute.
              I set the pace, I curate the atmosphere and I dictate the rules.
            </p>
            <p className="font-semibold text-neutral-100">
              Here, we don&rsquo;t chase. We attract.
            </p>
          </div>
        </section>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link
            href="/subscribe"
            className="inline-block rounded-full bg-amber-500 px-10 py-4 text-sm font-medium tracking-[0.2em] text-black transition hover:bg-amber-400"
          >
            JOIN THE JOURNEY
          </Link>
          <p className="mt-8 italic text-neutral-400">
            Wanderlust Wonderer —{" "}
            <span className="text-amber-400">Unfiltered. Unrestricted.</span>
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
