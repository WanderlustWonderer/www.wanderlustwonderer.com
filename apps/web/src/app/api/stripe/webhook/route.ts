import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe/client'
import { syncSubscriptionToProfile, findUserForCustomer } from '@/lib/stripe/sync'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * Stripe webhook handler.
 * Register this endpoint in Stripe Dashboard → Developers → Webhooks with events:
 *   checkout.session.completed
 *   customer.subscription.created
 *   customer.subscription.updated
 *   customer.subscription.deleted
 * Then put the signing secret in STRIPE_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(await req.text(), signature, secret)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.mode === 'subscription') {
          await handleSubscriptionCheckout(session)
        } else if (session.mode === 'payment') {
          await handleOneOffPurchase(session)
        }
        break
      }
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await handleSubscriptionChange(event.data.object)
        break
      }
    }
  } catch (err) {
    console.error(`Webhook handler failed for ${event.type}:`, err)
    // Non-2xx makes Stripe retry — desired for transient DB failures.
    return NextResponse.json({ error: 'Handler failure' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

/** New subscription via our /subscribe page. */
async function handleSubscriptionCheckout(session: Stripe.Checkout.Session) {
  const customerId = stringId(session.customer)
  const subscriptionId = stringId(session.subscription)
  if (!customerId || !subscriptionId) return

  // client_reference_id is set to the Supabase user id when creating the
  // Checkout Session on the /subscribe page.
  const userId =
    session.client_reference_id ??
    (await findUserForCustomer(customerId, session.customer_details?.email ?? null))
  if (!userId) {
    console.warn(`No user found for checkout session ${session.id}`)
    return
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  await syncSubscriptionToProfile(userId, customerId, subscription)
}

/** Ongoing lifecycle: renewals, upgrades, cancellations, payment failures. */
async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const customerId = stringId(subscription.customer)
  if (!customerId) return

  let email: string | null = null
  try {
    const customer = await stripe.customers.retrieve(customerId)
    if (!customer.deleted) email = customer.email
  } catch {
    /* customer lookup is best-effort */
  }

  const userId = await findUserForCustomer(customerId, email)
  if (!userId) {
    // Legacy member who hasn't created an account in the new app yet.
    // Safe to ignore: reconcileLegacyMember() links them at first sign-in.
    console.info(`No profile yet for Stripe customer ${customerId}; skipping.`)
    return
  }

  await syncSubscriptionToProfile(userId, customerId, subscription)
}

/** One-off Collection purchase: record order (+ booking when applicable). */
async function handleOneOffPurchase(session: Stripe.Checkout.Session) {
  const supabase = createAdminClient()
  const customerId = stringId(session.customer)

  const userId =
    session.client_reference_id ??
    (customerId
      ? await findUserForCustomer(customerId, session.customer_details?.email ?? null)
      : null)
  if (!userId) {
    console.warn(`No user found for one-off checkout ${session.id}`)
    return
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
  })

  for (const item of lineItems.data) {
    const priceId = item.price?.id
    if (!priceId) continue

    const { data: product } = await supabase
      .from('products')
      .select('id, product_type')
      .eq('stripe_price_id', priceId)
      .maybeSingle()
    if (!product) {
      console.warn(`No product found for price ${priceId}`)
      continue
    }

    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        user_id: userId,
        product_id: product.id,
        stripe_payment_intent_id: stringId(session.payment_intent),
        status: 'paid',
      })
      .select('id')
      .single()
    if (error) {
      // Unique constraint hit = webhook retry of an already-recorded order.
      if (error.code === '23505') continue
      throw error
    }

    if (product.product_type === 'booking') {
      const { error: bookingError } = await supabase.from('bookings').insert({
        user_id: userId,
        product_id: product.id,
        order_id: order.id,
        status: 'scheduled', // scheduled_at + meeting_url set later by the Muse
      })
      if (bookingError) throw bookingError
    }
  }
}

function stringId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}
