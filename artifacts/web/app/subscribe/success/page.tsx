import Link from 'next/link'
import { redirect } from 'next/navigation'
import { stripe } from '@/lib/stripe/client'
import { syncSubscriptionToProfile } from '@/lib/stripe/sync'
import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Checkout success page.
 * The webhook is the source of truth, but it can lag a second or two —
 * so we also sync eagerly here from the session id for an instant
 * "you're in" experience.
 */
export default async function SubscribeSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { session_id } = await searchParams

  if (session_id) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id, {
        expand: ['subscription'],
      })
      // Only act on the signed-in user's own session.
      if (
        session.client_reference_id === user.id &&
        session.subscription &&
        typeof session.subscription !== 'string'
      ) {
        await syncSubscriptionToProfile(
          user.id,
          typeof session.customer === 'string'
            ? session.customer
            : (session.customer?.id ?? ''),
          session.subscription,
        )
      }
    } catch {
      // Webhook will catch up; don't block the success page.
    }
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        The door is open.
      </h1>
      <p className="mt-4 opacity-70">
        Your membership is active. Welcome to the inner frequency.
      </p>
      <div className="mt-10 flex gap-4">
        <Link
          href="/portal"
          className="rounded-full bg-amber-500 px-6 py-3 text-sm font-medium text-black hover:bg-amber-400"
        >
          Enter The Portal
        </Link>
        <Link
          href="/account"
          className="rounded-full border border-neutral-500 px-6 py-3 text-sm hover:border-amber-500"
        >
          Your account
        </Link>
      </div>
    </main>
  )
}
