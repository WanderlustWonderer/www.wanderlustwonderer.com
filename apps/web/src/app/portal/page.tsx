import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { tierRank } from '@/lib/stripe/tiers'
import { ContentList } from './content-list'

export const dynamic = 'force-dynamic'

export default async function PortalPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/portal')

  const { data: profile } = await supabase
    .from('profiles')
    .select('membership_tier, subscription_status')
    .eq('id', user.id)
    .maybeSingle()

  const rank = tierRank(profile?.membership_tier)
  if (rank < 1) redirect('/subscribe')

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">The Gallery</h1>
        <p className="mt-3 opacity-70">You are inside. Look closer.</p>
        <nav className="mt-6 flex justify-center gap-4 text-sm">
          <span className="text-amber-500">The Gallery</span>
          {rank >= 2 ? (
            <Link href="/portal/private-world" className="hover:text-amber-500">
              Private World
            </Link>
          ) : (
            <Link href="/subscribe" className="opacity-40 hover:opacity-70">
              Private World 🔒
            </Link>
          )}
          {rank >= 3 ? (
            <Link href="/portal/all-access" className="hover:text-amber-500">
              All Access
            </Link>
          ) : (
            <Link href="/subscribe" className="opacity-40 hover:opacity-70">
              All Access 🔒
            </Link>
          )}
        </nav>
      </header>

      <ContentList tier="the_gallery" />
    </main>
  )
}
