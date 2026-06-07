import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Tier hierarchy — higher index = higher access
const TIER_RANK: Record<string, number> = {
  the_gallery: 1,
  private_world: 2,
  all_access: 3,
}

// Routes that require a minimum tier
const PROTECTED_ROUTES: Record<string, string> = {
  '/portal': 'the_gallery',
  '/portal/private-world': 'private_world',
  '/portal/all-access': 'all_access',
  '/messages': 'the_gallery',
  '/account': 'the_gallery',
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Check if route requires a membership tier
  const requiredTier = Object.entries(PROTECTED_ROUTES).find(([route]) =>
    path.startsWith(route)
  )?.[1]

  if (requiredTier) {
    // Not logged in — send to login
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // Fetch membership tier from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('membership_tier, subscription_status')
      .eq('id', user.id)
      .single()

    const userTierRank = TIER_RANK[profile?.membership_tier ?? ''] ?? 0
    const requiredTierRank = TIER_RANK[requiredTier] ?? 0

    // No active subscription
    if (profile?.subscription_status !== 'active') {
      return NextResponse.redirect(new URL('/subscribe', request.url))
    }

    // Tier too low — redirect to upgrade page
    if (userTierRank < requiredTierRank) {
      return NextResponse.redirect(new URL('/upgrade', request.url))
    }
  }

  // Admin routes
  if (path.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    // Admin check handled inside admin pages via server-side role check
  }

  return supabaseResponse
}
