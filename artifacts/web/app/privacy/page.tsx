import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

export const metadata = { title: "Privacy Policy" };

const SECTIONS: { h: string; p: string }[] = [
  { h: "1. Overview", p: "This policy explains what personal data Wanderlust Wonderer collects, why, and your rights over it. We aim to collect only what we need to run the service." },
  { h: "2. What we collect", p: "Account details (email, login credentials managed by our auth provider), membership and purchase history, messages and content you interact with, chat credit balances, and limited technical data such as device/usage information needed to operate and secure the site." },
  { h: "3. Payments", p: "Payments are processed by Stripe. We never see or store your full card number — Stripe handles card data under its own PCI-compliant systems. We store only a customer/subscription reference and the status of your payments." },
  { h: "4. Email", p: "If you sign up for updates or are an existing member, we may send you service and marketing emails via our email provider (Resend). Marketing emails include an unsubscribe link, and open/click activity may be measured to improve relevance. You can opt out at any time." },
  { h: "5. How we use your data", p: "To provide and bill your membership, deliver content, run live chat and sessions, prevent fraud and abuse, comply with legal obligations, and (with your consent where required) send marketing." },
  { h: "6. Sharing", p: "We share data only with processors that help us run the service — for example payment (Stripe), hosting/database (Supabase), and email (Resend) — under appropriate agreements. We do not sell your personal data." },
  { h: "7. Security & retention", p: "Access to member content is restricted and media is watermarked and traceable. We keep personal data only as long as needed for the purposes above or as required by law, then delete or anonymise it." },
  { h: "8. Your rights", p: "Depending on where you live, you may have rights to access, correct, delete or export your data, and to object to or restrict certain processing. To exercise these, contact us using the details below." },
  { h: "9. Contact", p: `For any privacy request, contact hello@wanderlustwonderer.com.` },
];

export default function PrivacyPage() {
  return (
    <div className="bg-black text-neutral-100 min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Privacy Policy</h1>
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
