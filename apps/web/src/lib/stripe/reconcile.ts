import 'server-only'
import { stripe } from './client'
import { syncSubscriptionToProfile } from './sync'
import { grantsAccess, PRICE_TO_TIER, tierRank } from './tiers'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * LEGACY MEMBER RECONCILIATION
 *
 * ~10 paying members exist in Stripe from the old WordPress/MemberPress site
 * (billing on archived legacy prices — their subscriptions are untouched and
 * keep renewing). They have no Supabase account yet.
 *
 * When anyone signs in to the new app, call this once. It looks up live
 * Stripe data by the user's email and, if an access-granting subscription
 * exists, links it to their profile. Existing members regain their tier the
 * moment they create an account with the same email — zero manual migration,
 * zero billing disruption.
 *
 * Call from the auth callback or a server component, e.g.:
 *   if (!profile.stripe_customer_id) {
 *     await reconcileLegacyMember(user.id, user.email)
 *   }
 */
export async function reconcileLegacyMember(
  userId: string,
  email: string | null | undefined,
): Promise<boolean> {
  if (!email) return false

  const supabase = createAdminClient()

  // Already linked? Nothing to do.
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .maybeSingle()
  if (profile?.stripe_customer_id) return false

  // Find Stripe customers with this email (legacy site may have created
  // more than one customer per person).
  const { data: customers } = await stripe.customers.list({ email, limit: 10 })
  if (customers.length === 0) return false

  // Collect every access-granting subscription across those customers and
  // keep the one with the highest tier.
  let best: { customerId: string; subscriptionId: string; rank: number } | null =
    null

  for (const customer of customers) {
    const { data: subs } = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 20,
    })
    for (const sub of subs) {
      if (!grantsAccess(sub.status)) continue
      for (const item of sub.items.data) {
        const tier = PRICE_TO_TIER[item.price.id]
        if (!tier) continue
        const rank = tierRank(tier)
        if (!best || rank > best.rank) {
          best = { customerId: customer.id, subscriptionId: sub.id, rank }
        }
      }
    }
  }

  if (!best) return false

  const subscription = await stripe.subscriptions.retrieve(best.subscriptionId)
  await syncSubscriptionToProfile(userId, best.customerId, subscription)
  return true
}
