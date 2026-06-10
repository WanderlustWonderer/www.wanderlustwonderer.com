import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

const OG_IMAGE =
  "https://i0.wp.com/wanderlustwonderer.com/wp-content/uploads/2026/04/IMG_2231-829x1024.jpg?ssl=1";
const MUSE_TITLE = "Tasmyn Leigh — FHM New Zealand | Wanderlust Wonderer";
const MUSE_DESC =
  "Tasmyn Leigh, the Wanderlust Wonderer — FHM New Zealand cover model, traveller (39 countries and counting), certified yoga instructor and digital creator. Step inside her world.";

export const metadata = {
  title: { absolute: MUSE_TITLE },
  description: MUSE_DESC,
  keywords: ["Tasmyn Leigh", "Tasmyn Leigh FHM", "FHM New Zealand", "FHM cover", "Wanderlust Wonderer", "model", "yoga instructor", "digital creator"],
  alternates: { canonical: "/muse" },
  openGraph: {
    type: "profile",
    title: MUSE_TITLE,
    description: MUSE_DESC,
    url: "/muse",
    siteName: "Wanderlust Wonderer",
    images: [{ url: OG_IMAGE, width: 829, height: 1024, alt: "Tasmyn Leigh — Wanderlust Wonderer" }],
  },
  twitter: {
    card: "summary_large_image",
    title: MUSE_TITLE,
    description: MUSE_DESC,
    images: [OG_IMAGE],
  },
};

const JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      name: "Tasmyn Leigh",
      alternateName: "Wanderlust Wonderer",
      jobTitle: "Model, Yoga Instructor & Digital Creator",
      description: "FHM New Zealand cover model, traveller, certified yoga instructor and digital creator.",
      url: "https://wanderlustwonderer.com/muse",
      image: OG_IMAGE,
      sameAs: [
        "https://www.instagram.com/wanderlust_wonderer/",
        "https://www.tiktok.com/@dailyyogadiary",
      ],
    },
    {
      "@type": "WebSite",
      name: "Wanderlust Wonderer",
      url: "https://wanderlustwonderer.com",
      about: "Tasmyn Leigh — the Wanderlust Wonderer",
    },
  ],
};

export default function MusePage() {
  return (
    <div className="text-neutral-100 min-h-screen">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSONLD) }} />
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

        {/* Above-the-fold CTA — cold FHM readers convert on connection, lead with the free chat */}
        <div className="mt-9 flex flex-col items-center gap-3">
          <a
            href="/signup?next=/chat"
            className="rounded-full bg-amber-500 px-8 py-3.5 text-sm font-semibold tracking-wide text-black shadow-lg shadow-amber-500/20 transition hover:bg-amber-400"
          >
            Start chatting with me — free
          </a>
          <p className="text-xs tracking-wide text-neutral-400">3 free messages · no card needed · 18+</p>
        </div>

        {/* Featured FHM film (silent) */}
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
              But my true transformation happened in 2025. While working five jobs
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
        </article>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link
            href="/subscribe"
            className="inline-block rounded-full bg-amber-500 px-10 py-4 text-sm font-medium tracking-[0.2em] text-black transition hover:bg-amber-400"
          >
            JOIN THE JOURNEY
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
