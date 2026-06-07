import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { tierRank } from '@/lib/stripe/tiers'
import { ContentList } from '../content-list'

export const dynamic = 'force-dynamic'

export default async function AllAccessPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/portal/all-access')

  const { data: profile } = await supabase
    .from('profiles')
    .select('membership_tier')
    .eq('id', user.id)
    .maybeSingle()

  if (tierRank(profile?.membership_tier) < 3) redirect('/subscribe')

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">All Access</h1>
        <p className="mt-3 opacity-70">Nothing held back.</p>
        <nav className="mt-6 flex justify-center gap-4 text-sm">
          <Link href="/portal" className="hover:text-amber-500">
            The Gallery
          </Link>
          <Link href="/portal/private-world" className="hover:text-amber-500">
            Private World
          </Link>
          <span className="text-amber-500">All Access</span>
        </nav>
      </header>

      <ContentList tier="all_access" />
    </main>
  )
}
