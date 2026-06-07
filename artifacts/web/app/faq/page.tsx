import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

const FAQS = [
  {
    q: "What is The Portal?",
    a: "The Portal is the members-only side of Wanderlust Wonderer: three tiers of exclusive content, from weekly yoga journeys to the fully unfiltered story.",
  },
  {
    q: "How do memberships work?",
    a: "Choose a tier on the Become a Member page. Billing is monthly via Stripe and you can manage or cancel any time from your account.",
  },
  {
    q: "What is The Collection?",
    a: "Direct offerings — gifts, tributes and private live sessions with the Muse. One-off purchases, no subscription required.",
  },
  {
    q: "How do live sessions work?",
    a: "After you claim a live session in The Collection, the Muse contacts you personally to arrange the time. Sessions take place on Microsoft Teams.",
  },
  {
    q: "Can I cancel my membership?",
    a: "Yes — any time from your account page via the billing portal. Access continues until the end of the billing period.",
  },
];

export default function FaqPage() {
  return (
    <div className="bg-black text-neutral-100 min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-center text-3xl font-semibold tracking-[0.15em] uppercase">FAQ</h1>
        <div className="mt-12 space-y-8">
          {FAQS.map((f) => (
            <div key={f.q} className="border-b border-neutral-800 pb-6">
              <h2 className="font-semibold text-lg">{f.q}</h2>
              <p className="mt-2 text-neutral-300 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
