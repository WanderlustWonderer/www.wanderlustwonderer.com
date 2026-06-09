import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata = {
  title: "The Practice",
  description: "The teacher, the ritual, the return. The story behind the 365-day yoga journey.",
};

export default function PracticePage() {
  return (
    <div className="bg-black text-neutral-100 min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-center text-3xl font-semibold tracking-[0.15em] uppercase">The Practice</h1>
        <p className="mt-2 text-center text-sm tracking-[0.3em] uppercase text-amber-400/90">
          The Teacher. The Ritual. The Return.
        </p>
        <div className="mt-12 space-y-6 leading-relaxed text-neutral-300">
          <p>
            Yoga is the teacher that never stops teaching. As the student, you learn the
            art of truly listening to the body, to the mind and to the whispers of the
            soul. It is a way of life that has remained my only constant through every
            season of Life.
          </p>
          <p>
            My initiation into the deeper layers of this practice was born from the fire
            of transformation. Following the passing of my father, I sought a sanctuary
            for my grief and a focus for my strength. I qualified as a teacher shortly
            after, an anchor that held me when I felt most adrift. From late 2023 through
            mid-2024, I immersed myself in the industry, teaching at the likes of{" "}
            <strong className="text-neutral-100">Soho House</strong> and{" "}
            <strong className="text-neutral-100">Fitness First</strong> in London, sharing
            my energy with as many as I could reach.
          </p>
          <p>
            But as 2024 unfolded, my rhythm began to break. The crumbling of a long-term
            relationship, paired with truly uncomfortable scenarios that played out within
            the walls of the classroom, clouded my vision. I felt the light fading from my
            own practice and I took the decision to stop teaching.
          </p>
          <p className="text-neutral-100 font-medium">I had to lose my way to find my true north.</p>
          <p className="text-neutral-100 font-semibold">The 365-Day Yoga Challenge was my way back home.</p>
          <p>
            On January 1st, 2025, I committed to showing up for myself every single day. I
            posted to TikTok for no other reason than to remain accountable to my own
            healing and to rediscover the love I had lost. To my wonder, I found a
            community of souls who resonated with that raw, daily devotion. What started
            as a personal ritual of survival became a shared inspiration of strength.
          </p>
          <p>
            Now, the journey evolves again. I have reclaimed my practice on my own terms:
            Unfiltered, Unrestricted and centred in peace.{" "}
            <strong className="text-neutral-100">Move with me.</strong>
          </p>
        </div>
        <div className="mt-12 text-center">
          <a href="https://www.tiktok.com/@dailyyogadiary" className="block text-sm tracking-[0.25em] text-neutral-400 hover:text-amber-400">
            @DAILYYOGADIARY ON TIKTOK
          </a>
          <Link href="/subscribe" className="mt-8 inline-block rounded-full bg-amber-500 px-10 py-4 text-sm font-medium tracking-[0.2em] text-black hover:bg-amber-400 transition">
            JOIN THE CIRCLE
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
