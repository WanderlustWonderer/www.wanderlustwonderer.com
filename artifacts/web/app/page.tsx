import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export default function HomePage() {
  return (
    <div className="bg-black text-neutral-100 min-h-screen">
      <SiteNav />
      <main>
        {/* Hero */}
        <section className="mx-auto max-w-4xl px-6 py-20 text-center">
          <h1 className="text-3xl md:text-4xl font-semibold leading-snug">
            Curious? Step inside and explore the Muse&rsquo;s content this week.
          </h1>
          <img
            src="https://wanderlustwonderer.com/wp-content/uploads/2026/03/Gemini_Generated_Image_witntgwitntgwitn.png"
            alt="Wanderlust Wonderer"
            className="mx-auto mt-10 w-64 rounded-full border border-amber-500/30"
          />
          <Link
            href="/subscribe"
            className="mt-10 inline-block rounded-full bg-amber-500 px-10 py-4 text-sm font-medium tracking-[0.2em] text-black hover:bg-amber-400 transition"
          >
            STEP INTO MY FREQUENCY
          </Link>
        </section>

        {/* The Unfiltered Truth */}
        <section className="border-t border-neutral-900">
          <div className="mx-auto max-w-5xl px-6 py-20 grid gap-10 md:grid-cols-2 items-center">
            <img
              src="https://wanderlustwonderer.com/wp-content/uploads/2026/03/0364f776-9c06-4481-b5d3-b83a6053b8da-edited.jpg"
              alt="The Unfiltered Truth"
              className="rounded-2xl border border-neutral-800"
            />
            <div>
              <h2 className="text-2xl font-semibold">The Unfiltered Truth</h2>
              <p className="mt-4 leading-relaxed text-neutral-300">
                Social media is a performance for the masses; this is the reality for the
                elite. I have moved my raw, unedited journey here, away from the
                restrictions of the public eye. You are invited to witness the sacred
                discipline of the mat to my most private adventures.
              </p>
              <Link href="/subscribe" className="mt-6 inline-block text-amber-400 tracking-[0.2em] text-sm hover:text-amber-300">
                ENTER THE PORTAL →
              </Link>
            </div>
          </div>
        </section>

        {/* Direct offerings */}
        <section className="border-t border-neutral-900">
          <div className="mx-auto max-w-5xl px-6 py-20 grid gap-10 md:grid-cols-2 items-center">
            <div className="md:order-2">
              <img
                src="https://wanderlustwonderer.com/wp-content/uploads/2026/03/IMG_5317-edited.jpg"
                alt="The Collection"
                className="rounded-2xl border border-neutral-800"
              />
            </div>
            <div className="md:order-1">
              <h2 className="text-2xl font-semibold">Direct offerings for the modern Muse.</h2>
              <p className="mt-4 leading-relaxed text-neutral-300">
                A life of exquisite beauty requires constant cultivation. Whether it is
                aura-boosting florals, my daily caffeine ritual, or sponsorship for my next
                spontaneous escape, your tribute is the energy that keeps this story
                unfolding. I do not ask; I simply provide the opportunity for you to be
                useful.
              </p>
              <Link href="/tribute" className="mt-6 inline-block text-amber-400 tracking-[0.2em] text-sm hover:text-amber-300">
                SUBMIT TRIBUTE →
              </Link>
            </div>
          </div>
        </section>

        {/* Personalised & Private */}
        <section className="border-t border-neutral-900">
          <div className="mx-auto max-w-5xl px-6 py-20 grid gap-10 md:grid-cols-2 items-center">
            <img
              src="https://wanderlustwonderer.com/wp-content/uploads/2026/03/whatsapp-image-2026-03-08-at-21.07.30-24-edited.jpeg"
              alt="Personalised and Private"
              className="rounded-2xl border border-neutral-800"
            />
            <div>
              <h2 className="text-2xl font-semibold">Personalised &amp; Private</h2>
              <p className="mt-4 leading-relaxed text-neutral-300">
                Your desire, my design. For those who seek a more direct connection, I
                accept bespoke requests. From private yoga flows to tailored experiences
                designed specifically for your eyes — state your intent and provide your
                offering. I set the terms; you reap the reward.
              </p>
              <Link href="/tribute" className="mt-6 inline-block text-amber-400 tracking-[0.2em] text-sm hover:text-amber-300">
                SEND YOUR INTENT →
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
