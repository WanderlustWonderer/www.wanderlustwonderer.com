import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { reconcileLegacyMember } from "@/lib/stripe/reconcile";
import { balances } from "@/lib/wallet/ledger";
import { WalletHistory } from "@/components/wallet-history";
import { CREDIT_PACKS } from "@/config/creator";
import { CheckoutButton } from "@/components/companion/CheckoutButton";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { computeAchievements, tenureLabel } from "@/lib/achievements";
import { ProfileEditor } from "@/components/profile-editor";
import { WaitingGame } from "@/components/waiting-game";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };


const TIER_NAME: Record<string, string> = {
  the_gallery: "The Gallery",
  private_world: "Private World",
  all_access: "All Access",
};

const MONTHLY_CREDITS: Record<string, number> = {
  the_gallery: 5,
  private_world: 8,
  all_access: 15,
};

const LEDGER_LABELS: Record<string, string> = {
  signup_bonus: "Welcome credits",
  game_reward: "Free message won ✨",
  monthly_grant: "Monthly membership credits",
  monthly_void: "Expired with renewal",
  credit_purchase: "Top-up",
  message: "Message sent",
  auto_refund: "Refund (message failed)",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="text-neutral-100 min-h-screen">
        <SiteNav />
        <main className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h1 className="text-3xl font-semibold">Your Account</h1>
          <p className="mt-4 opacity-70">Sign in to view your membership, wallet and chat.</p>
          <Link href="/login" className="mt-8 inline-block rounded-full bg-amber-500 px-8 py-3 text-sm font-medium text-black hover:bg-amber-400">
            Sign in
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const admin = createAdminClient();

  let { data: profile } = await admin
    .from("profiles")
    .select("membership_tier, subscription_status, subscription_end_date, stripe_customer_id, created_at, display_name, bio, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.stripe_customer_id) {
    const linked = await reconcileLegacyMember(user.id, user.email);
    if (linked) {
      const { data } = await admin
        .from("profiles")
        .select("membership_tier, subscription_status, subscription_end_date, stripe_customer_id, created_at, display_name, bio, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      profile = data;
    }
  }

  const isMember =
    !!profile?.subscription_status &&
    ["active", "trialing"].includes(profile.subscription_status);
  const tier = isMember ? (profile?.membership_tier ?? null) : null;

  const [wallet, { data: ledger }, { data: bookingRows }, { data: orderRows }] = await Promise.all([
    balances(admin, user.id),
    admin
      .from("credit_ledger")
      .select("delta, reason, pot, created_at")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("bookings")
      .select("id, scheduled_at, meeting_url, status, products(name)")
      .eq("user_id", user.id)
      .order("scheduled_at", { ascending: true }),
    admin
      .from("orders")
      .select("status, created_at, products(price)")
      .eq("user_id", user.id),
  ]);
  const bookings = (bookingRows ?? []) as Array<{ id: string; scheduled_at: string | null; meeting_url: string | null; status: string; products: { name: string } | null }>;
  const orders = (orderRows ?? []) as Array<{ products: { price: number } | null }>;
  const memberSinceMs = profile?.created_at ? new Date(profile.created_at).getTime() : null;
  const achievements = computeAchievements({
    tier,
    isMember,
    memberSinceMs,
    orderCount: orders.length,
    totalSpendPence: orders.reduce((sum, o) => sum + (o.products?.price ?? 0), 0),
    sessionCount: bookings.length,
  });

  return (
    <div className="text-neutral-100 min-h-screen">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-semibold tracking-tight">Your Account</h1>
        <p className="mt-2 text-sm opacity-60">{user.email}</p>

        {/* Your profile — bio + avatar (personalises the experience + the AI) */}
        <section className="mt-10 rounded-2xl border border-neutral-700 p-8">
          <h2 className="text-lg font-semibold">Your Profile</h2>
          <p className="mt-1 text-sm opacity-60">Add a photo and a few words about yourself. It makes your time here more personal — and helps the Muse get to know you.</p>
          <div className="mt-6">
            <ProfileEditor
              initialName={profile?.display_name ?? ""}
              initialBio={profile?.bio ?? ""}
              initialAvatar={profile?.avatar_url ?? null}
              email={user.email ?? ""}
            />
          </div>
        </section>

        {/* Waiting-room game — play while the Muse replies; 1 in 5 wins a free message */}
        <section className="mt-10">
          <WaitingGame />
        </section>

        {/* Membership · content · achievements (merged) */}
        <section className="mt-10 rounded-2xl border border-neutral-700 p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Your Membership</h2>
              {isMember && tier ? (
                <>
                  <p className="mt-3 text-2xl font-semibold text-amber-500">{TIER_NAME[tier] ?? tier}</p>
                  <p className="mt-1 text-sm opacity-70">
                    Member for {tenureLabel(memberSinceMs)} · {MONTHLY_CREDITS[tier] ?? 0} free chat credits / month · renews {formatDate(profile?.subscription_end_date ?? null)}
                  </p>
                </>
              ) : (
                <p className="mt-3 opacity-70">Guest account — chat with purchased credits, or join for monthly free credits, content &amp; sessions.</p>
              )}
            </div>
            {isMember ? (
              <Link href="/account/manage" className="rounded-full border border-neutral-500 px-5 py-2.5 text-sm hover:border-amber-500 hover:text-amber-500">Manage &amp; billing</Link>
            ) : (
              <Link href="/subscribe" className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-medium text-black hover:bg-amber-400">Become a member</Link>
            )}
          </div>

          <div className="mt-6 border-t border-neutral-800 pt-6">
            <p className="text-sm opacity-70">Everything your membership unlocks — the last 4 weeks of content, plus anything you own from the Vault.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href="/portal" className="rounded-full bg-amber-500 px-5 py-2.5 text-sm font-medium text-black hover:bg-amber-400">View your content</Link>
              <Link href="/portal/vault" className="rounded-full border border-neutral-500 px-5 py-2.5 text-sm hover:border-amber-500 hover:text-amber-500">The Vault</Link>
            </div>
          </div>

          <div className="mt-6 border-t border-neutral-800 pt-6">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Achievements</h3>
              <span className="text-xs opacity-60">{achievements.filter((a) => a.earned).length} / {achievements.length} unlocked</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {achievements.map((a) => (
                <div key={a.key} title={a.hint} className={`flex items-center gap-2 rounded-xl border p-3 ${a.earned ? "border-amber-500/40 bg-amber-500/5" : "border-neutral-800 opacity-50"}`}>
                  <span className={`text-xl ${a.earned ? "" : "grayscale"}`}>{a.emoji}</span>
                  <span className="leading-tight">
                    <span className={`block text-sm font-medium ${a.earned ? "text-amber-300" : "text-neutral-400"}`}>{a.label}</span>
                    <span className="block text-xs opacity-60">{a.earned ? "Unlocked" : a.hint}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Wallet */}
        <section className="mt-8 rounded-2xl border border-amber-500/40 p-8">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Wallet</h2>
            <p className="text-4xl font-semibold text-amber-500">
              {wallet.total}
              <span className="ml-2 text-sm font-normal text-neutral-400">credit{wallet.total === 1 ? "" : "s"}</span>
            </p>
          </div>
          {wallet.subscription > 0 && (
            <p className="mt-1 text-xs opacity-60">
              {wallet.subscription} membership credit{wallet.subscription === 1 ? "" : "s"} expire at your next renewal — they're spent first.
            </p>
          )}
          <p className="mt-4 text-sm opacity-70">1 credit = 1 chat message (max 250 characters). Purchased credits never expire.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {CREDIT_PACKS.map((pack) => (
              <div key={pack.key} className="rounded-xl border border-neutral-700 p-4 text-center">
                <p className="text-xl font-semibold">{pack.credits} credit{pack.credits === 1 ? "" : "s"}</p>
                <p className="text-sm opacity-60">{pack.priceLabel}</p>
                <div className="mt-3">
                  <CheckoutButton kind="credits" itemKey={pack.key} label={`Buy for ${pack.priceLabel}`} featured={pack.key === "pack20"} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link href="/chat" className="inline-block rounded-full bg-amber-500 px-8 py-3 text-sm font-medium text-black hover:bg-amber-400">
              Open chat
            </Link>
          </div>
          <div className="mt-8 border-t border-neutral-800 pt-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Wallet history</h3>
            <WalletHistory rows={(ledger ?? []).map((row) => ({ label: LEDGER_LABELS[row.reason] ?? row.reason, delta: row.delta, created_at: row.created_at }))} />
          </div>
        </section>

        {/* Bookings */}
        <section className="mt-8 rounded-2xl border border-neutral-700 p-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your sessions</h2>
            <Link href="/book" className="text-sm text-amber-500 hover:text-amber-400">Book a session →</Link>
          </div>
          {bookings.length > 0 ? (
            <ul className="mt-4 divide-y divide-neutral-800">
              {bookings.map((b) => (
                <li key={b.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{b.products?.name ?? "Session"}</p>
                    <p className="opacity-60">{b.scheduled_at ? new Date(b.scheduled_at).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Paid — not yet scheduled"}</p>
                  </div>
                  {!b.scheduled_at ? (
                    <Link href="/book" className="rounded-full bg-amber-500 px-4 py-1.5 text-xs font-medium text-black hover:bg-amber-400">Schedule a time</Link>
                  ) : b.meeting_url ? (
                    <a href={b.meeting_url} className="rounded-full bg-amber-500 px-4 py-1.5 text-xs font-medium text-black hover:bg-amber-400">Join</a>
                  ) : (
                    <span className="text-xs uppercase tracking-wide opacity-50">{b.status}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm opacity-50">No sessions booked yet.</p>
          )}
        </section>

      </main>
      <SiteFooter />
    </div>
  );
}
