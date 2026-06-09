import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { TIER_PRICE_IDS, tierRank, type MembershipTier } from '@/lib/stripe/tiers'
import { createClient, createAdminClient } from '@/utils/supabase/server'
import { getAppUrl } from "@/lib/app-url";

export const runtime = 'nodejs'

const VALID_TIERS: MembershipTier[] = ['the_gallery', 'private_world', 'all_access']

/**
 * POST /api/stripe/checkout
 * Body: { tier: MembershipTier }   → subscription checkout (/subscribe)
 *   or { productId: string }       → one-off Collection purchase (/collection)
 * Returns { url } to redirect the member to Stripe Checkout.
 *
 * Honours the webhook contract:
 *  - client_reference_id = Supabase user id
 *  - reuses profiles.stripe_customer_id when present, else customer_email
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body: { tier?: MembershipTier; productId?: string; offer?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id, subscription_status, membership_tier')
    .eq('id', user.id)
    .maybeSingle()

  const appUrl = getAppUrl(req);
  const customerParams = profile?.stripe_customer_id
    ? { customer: profile.stripe_customer_id }
    : { customer_email: user.email ?? undefined }

  // ---- One-off Collection purchase ----
  if (body.productId) {
    const { data: product } = await admin
      .from('products')
      .select('id, name, stripe_price_id, active')
      .eq('id', body.productId)
      .maybeSingle()
    if (!product?.active || !product.stripe_price_id) {
      return NextResponse.json({ error: 'Product unavailable' }, { status: 404 })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: user.id,
      ...customerParams,
      line_items: [{ price: product.stripe_price_id, quantity: 1 }],
      success_url: `${appUrl}/collection/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/collection`,
    })
    return NextResponse.json({ url: session.url })
  }

  // ---- Subscription checkout ----
  if (!body.tier || !VALID_TIERS.includes(body.tier)) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  }

  const currentTier = (profile?.membership_tier as MembershipTier | null) ?? null
  const isActiveMember =
    !!profile?.subscription_status &&
    ['active', 'trialing'].includes(profile.subscription_status)
  const targetRank = tierRank(body.tier)
  const currentRank = tierRank(currentTier)
  const isUpgrade = isActiveMember && targetRank > currentRank

  // Active member choosing their current tier or a lower one → manage in portal
  // (no double-subscribe, no downgrade via checkout). Upgrades are allowed.
  if (isActiveMember && !isUpgrade) {
    return NextResponse.json(
      { error: 'already_subscribed', redirect: '/account/manage' },
      { status: 409 },
    )
  }

  const fromGallery = currentTier === 'the_gallery'
  const sessionParams: Record<string, unknown> = {
    mode: 'subscription',
    client_reference_id: user.id,
    ...customerParams,
    line_items: [{ price: TIER_PRICE_IDS[body.tier], quantity: 1 }],
    success_url: `${appUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/subscribe`,
    metadata: { upgrade: isUpgrade ? 'true' : 'false', from_tier: currentTier ?? '' },
    subscription_data: {
      metadata: { upgrade: isUpgrade ? 'true' : 'false', from_tier: currentTier ?? '' },
    },
  }
  const wantsMuse15 = body.offer === 'muse15' && !isActiveMember // first subscription only
  if (isUpgrade && fromGallery) {
    // 15% off for Gallery members upgrading to a higher tier (forever coupon).
    sessionParams.discounts = [{ coupon: process.env.STRIPE_UPGRADE_COUPON ?? 'UPGRADE15_1MO' }]
  } else if (wantsMuse15) {
    // MUSE15 — 15% off the first month for a new member's first subscription.
    sessionParams.discounts = [{ coupon: process.env.MUSE15_COUPON ?? 'kLjyj5df' }]
  } else {
    sessionParams.allow_promotion_codes = true
  }

  const session = await stripe.checkout.sessions.create(sessionParams as never)
  return NextResponse.json({ url: session.url })
}
