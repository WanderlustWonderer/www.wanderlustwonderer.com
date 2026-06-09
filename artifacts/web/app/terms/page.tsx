import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Terms of Service" };

const SECTIONS: { h: string; p: string }[] = [
  { h: "1. Who we are & eligibility", p: "This site is operated by Wanderlust Wonderer. The content is intended for adults only. By creating an account or purchasing, you confirm you are at least 18 years old (or the age of majority in your jurisdiction, whichever is higher) and that adult content is lawful where you live." },
  { h: "2. Accounts", p: "You are responsible for keeping your login details secure and for all activity under your account. Provide accurate information and keep it up to date. We may suspend or close accounts that breach these terms." },
  { h: "3. Memberships & billing", p: "Memberships are recurring subscriptions billed monthly in advance through our payment processor, Stripe. Your plan renews automatically until you cancel. Prices are shown at checkout. We may change pricing with notice; changes apply from your next renewal." },
  { h: "4. Cancellation & refunds", p: "You can cancel any time from your account; access continues until the end of the period you have already paid for, and you are not billed again after that. Because digital content is delivered immediately, payments are generally non-refundable except where required by law." },
  { h: "5. One-off purchases, credits & sessions", p: "Collection items, content unlocks, chat credits, Vault purchases and live sessions are one-off purchases. Credits have no cash value and are non-transferable. Live sessions are arranged directly after purchase; missed sessions may not be refundable." },
  { h: "6. Content licence & conduct", p: "All photos, videos and messages are owned by the creator and licensed to you for personal, private viewing only. You may not download, screen-record, copy, redistribute, publish or share any content. Every item is watermarked and traceable to your account. Breach may result in immediate termination and legal action." },
  { h: "7. Acceptable use", p: "You agree not to misuse the service, attempt to bypass paywalls or security, harass the creator or other users, or use the service for anything unlawful." },
  { h: "8. Disclaimers & liability", p: "The service is provided \"as is\". To the maximum extent permitted by law, we are not liable for indirect or consequential losses. Nothing in these terms limits liability that cannot be limited by law." },
  { h: "9. Changes & contact", p: `We may update these terms from time to time; continued use means you accept the changes. Questions about these terms can be sent to hello@wanderlustwonderer.com.` },
];

export default function TermsPage() {
  return (
    <div className="text-neutral-100 min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-3 text-sm text-neutral-500">Last updated: June 2026</p>
        <div className="mt-10 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.h}>
              <h2 className="text-lg font-semibold text-amber-400">{s.h}</h2>
              <p className="mt-2 text-sm leading-relaxed text-neutral-300">{s.p}</p>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
