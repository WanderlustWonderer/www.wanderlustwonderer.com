import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/client'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * GET /api/stripe/portal
 * Redirects the signed-in member to the Stripe Billing Portal
 * (manage payment method, upgrade/downgrade, cancel).
 * Used by /subscribe (already-subscribed case) and the /account page.
 */
export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.stripe_customer_id) {
    return NextResponse.redirect(new URL('/subscribe', req.url))
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin
  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${appUrl}/account`,
  })

  return NextResponse.redirect(session.url)
}
