import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/utils/supabase/server'
import { reconcileLegacyMember } from '@/lib/stripe/reconcile'
import { BuyButton } from '@/components/buy-button'

export const dynamic = 'force-dynamic'

const TIERS = [
  {
    key: 'the_gallery',
    name: 'The Gallery',
    price: '£55',
    tagline: 'The first veil lifts.',
    features: [
      'Weekly exclusive content in The Gallery',
      'Direct messages to the Muse',
      'Access to The Collection',
    ],
  },
  {
    key: 'private_world',
    name: 'Private World',
    price: '£100',
    tagline: 'Step inside the Private World.',
    features: [
      'Everything in The Gallery',
      'Private World galleries and videos',
      'Priority replies from the Muse',
    ],
    featured: true,
  },
  {
    key: 'all_access',
    name: 'All Access',
    price: '£250',
    tagline: 'Nothing held back.',
    features: [
      'Everything in Private World',
      'All Access exclusive drops',
      'First claim on bookings and experiences',
    ],
  },
] as const

export default async function SubscribePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/subscribe')

  const admin = createAdminClient()
  let { data: profile } = await admin
    .from('profiles')
    .select('membership_tier, subscription_status, stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle()

  // Legacy member from the old site? Link their existing Stripe
  // subscription by email before showing them a price they already pay.
  if (!profile?.stripe_customer_id) {
    const linked = await reconcileLegacyMember(user.id, user.email)
    if (linked) {
      const { data } = await admin
        .from('profiles')
        .select('membership_tier, subscription_status, stripe_customer_id')
        .eq('id', user.id)
        .maybeSingle()
      profile = data
    }
  }

  const isMember =
    !!profile?.subscription_status &&
    ['active', 'trialing'].includes(profile.subscription_status)

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">The Portal</h1>
        <p className="mt-3 text-lg opacity-70">
          Mystery | Magic | Movement — choose how close you come.
        </p>
      </header>

      {isMember && (
        <div className="mb-10 rounded-xl border border-amber-500/40 bg-amber-500/10 p-5 text-center">
          <p className="font-medium">
            You are already a member
            {profile?.membership_tier
              ? ` — ${profile.membership_tier.replace(/_/g, ' ')}`
              : ''}
            .
          </p>
          <a href="/api/stripe/portal" className="mt-1 inline-block underline">
            Manage your subscription
          </a>
        </div>
      )}

      <div className="grid gap-8 md:grid-cols-3">
        {TIERS.map((tier) => (
          <div
            key={tier.key}
            className={`flex flex-col rounded-2xl border p-8 ${
              tier.featured
                ? 'border-amber-500/60 shadow-lg shadow-amber-500/10'
                : 'border-neutral-700'
            }`}
          >
            <h2 className="text-xl font-semibold">{tier.name}</h2>
            <p className="mt-1 text-sm italic opacity-60">{tier.tagline}</p>
            <p className="mt-6 text-4xl font-semibold">
              {tier.price}
              <span className="text-base font-normal opacity-60"> / month</span>
            </p>
            <ul className="mt-6 flex-1 space-y-3 text-sm">
              {tier.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span aria-hidden>—</span>
                  {feature}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              <BuyButton
                payload={{ tier: tier.key }}
                label="Enter"
                featured={!!('featured' in tier && tier.featured)}
                disabled={isMember}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-10 text-center text-xs opacity-50">
        Payments are processed securely by Stripe. Cancel any time from your
        account.
      </p>
    </main>
  )
}
