import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { reconcileLegacyMember } from '@/lib/stripe/reconcile'

export const dynamic = 'force-dynamic'

const TIER_NAME: Record<string, string> = {
  the_gallery: 'The Gallery',
  private_world: 'Private World',
  all_access: 'All Access',
}

function formatGbp(pence: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: pence % 100 === 0 ? 0 : 2,
  }).format(pence / 100)
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function AccountPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/account')

  let { data: profile } = await supabase
    .from('profiles')
    .select(
      'membership_tier, subscription_status, subscription_end_date, stripe_customer_id',
    )
    .eq('id', user.id)
    .maybeSingle()

  // Legacy member from the old site? Link their Stripe subscription by email.
  if (!profile?.stripe_customer_id) {
    const linked = await reconcileLegacyMember(user.id, user.email)
    if (linked) {
      const { data } = await supabase
        .from('profiles')
        .select(
          'membership_tier, subscription_status, subscription_end_date, stripe_customer_id',
        )
        .eq('id', user.id)
        .maybeSingle()
      profile = data
    }
  }

  const isMember =
    !!profile?.subscription_status &&
    ['active', 'trialing'].includes(profile.subscription_status)

  // RLS: members can only read their own orders/bookings.
  const [{ data: orders }, { data: bookings }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, status, created_at, products(name, price)')
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('bookings')
      .select('id, status, scheduled_at, meeting_url, products(name)')
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight">Your Account</h1>
      <p className="mt-2 text-sm opacity-60">{user.email}</p>

      {/* Membership */}
      <section className="mt-10 rounded-2xl border border-neutral-700 p-8">
        <h2 className="text-lg font-semibold">Membership</h2>
        {isMember ? (
          <>
            <p className="mt-3">
              <span className="text-2xl font-semibold text-amber-500">
                {TIER_NAME[profile?.membership_tier ?? ''] ?? '—'}
              </span>
              {profile?.subscription_status === 'trialing' && (
                <span className="ml-3 rounded-full border border-amber-500/50 px-3 py-0.5 text-xs uppercase tracking-wide text-amber-500">
                  Trial
                </span>
              )}
            </p>
            <p className="mt-2 text-sm opacity-70">
              Renews {formatDate(profile?.subscription_end_date ?? null)}
            </p>
            <a
              href="/api/stripe/portal"
              className="mt-5 inline-block rounded-full border border-neutral-500 px-6 py-3 text-sm hover:border-amber-500 hover:text-amber-500"
            >
              Manage subscription & billing
            </a>
          </>
        ) : (
          <>
            <p className="mt-3 opacity-70">You are not a member yet.</p>
            <Link
              href="/subscribe"
              className="mt-5 inline-block rounded-full bg-amber-500 px-6 py-3 text-sm font-medium text-black hover:bg-amber-400"
            >
              Enter The Portal
            </Link>
          </>
        )}
      </section>

      {/* Bookings */}
      <section className="mt-8 rounded-2xl border border-neutral-700 p-8">
        <h2 className="text-lg font-semibold">Live sessions</h2>
        {bookings && bookings.length > 0 ? (
          <ul className="mt-4 divide-y divide-neutral-800">
            {bookings.map((booking) => (
              <li key={booking.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{booking.products?.name ?? 'Session'}</p>
                  <p className="opacity-60">
                    {booking.scheduled_at
                      ? formatDate(booking.scheduled_at)
                      : 'Awaiting arrangement — the Muse will contact you'}
                  </p>
                </div>
                {booking.meeting_url ? (
                  <a
                    href={booking.meeting_url}
                    className="rounded-full bg-amber-500 px-4 py-1.5 text-xs font-medium text-black hover:bg-amber-400"
                  >
                    Join
                  </a>
                ) : (
                  <span className="text-xs uppercase tracking-wide opacity-50">
                    {booking.status}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm opacity-50">No sessions yet.</p>
        )}
      </section>

      {/* Orders */}
      <section className="mt-8 rounded-2xl border border-neutral-700 p-8">
        <h2 className="text-lg font-semibold">Order history</h2>
        {orders && orders.length > 0 ? (
          <ul className="mt-4 divide-y divide-neutral-800">
            {orders.map((order) => (
              <li key={order.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <p className="font-medium">{order.products?.name ?? 'Item'}</p>
                  <p className="opacity-60">{formatDate(order.created_at)}</p>
                </div>
                <div className="text-right">
                  <p>{order.products ? formatGbp(order.products.price) : ''}</p>
                  <p className="text-xs uppercase tracking-wide opacity-50">
                    {order.status}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm opacity-50">No orders yet.</p>
        )}
      </section>
    </main>
  )
}
