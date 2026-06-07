import 'server-only'
import type Stripe from 'stripe'
import { createAdminClient } from '@/lib/supabase/server'
import { PRICE_TO_TIER, grantsAccess, highestTier } from './tiers'

/**
 * Core sync: write a Stripe subscription's state onto a Supabase profile.
 * Used by both the webhook (ongoing) and reconciliation (legacy members).
 *
 * Uses the service-role client — RLS keeps members from doing this themselves.
 */
export async function syncSubscriptionToProfile(
  userId: string,
  customerId: string,
  subscription: Stripe.Subscription | null,
): Promise<void> {
  const supabase = createAdminClient()

  if (!subscription || !grantsAccess(subscription.status)) {
    const { error } = await supabase
      .from('profiles')
      .update({
        membership_tier: null,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription?.id ?? null,
        subscription_status: (subscription?.status as never) ?? null,
        subscription_end_date: periodEnd(subscription),
      })
      .eq('id', userId)
    if (error) throw error
    return
  }

  const tier = highestTier(
    subscription.items.data.map((item) => PRICE_TO_TIER[item.price.id]),
  )

  const { error } = await supabase
    .from('profiles')
    .update({
      membership_tier: tier,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status as never,
      subscription_end_date: periodEnd(subscription),
    })
    .eq('id', userId)
  if (error) throw error
}

/** current_period_end lives on items in newer API versions; handle both. */
function periodEnd(subscription: Stripe.Subscription | null): string | null {
  if (!subscription) return null
  const ts =
    subscription.items?.data?.[0]?.current_period_end ??
    (subscription as unknown as { current_period_end?: number })
      .current_period_end
  return ts ? new Date(ts * 1000).toISOString() : null
}

/**
 * Find the Supabase user a Stripe customer belongs to.
 * 1. By profiles.stripe_customer_id (fast path, already linked)
 * 2. By email match against auth.users (legacy members' first webhook event)
 */
export async function findUserForCustomer(
  customerId: string,
  customerEmail: string | null,
): Promise<string | null> {
  const supabase = createAdminClient()

  const { data: byCustomer } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()
  if (byCustomer) return byCustomer.id

  if (customerEmail) {
    const { data: byEmail } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', customerEmail)
      .maybeSingle()
    if (byEmail) return byEmail.id
  }

  return null
}
