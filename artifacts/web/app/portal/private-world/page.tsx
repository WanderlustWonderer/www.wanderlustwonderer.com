import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { tierRank } from '@/lib/stripe/tiers'
import { ContentList } from '../content-list'

export const dynamic = 'force-dynamic'

export default async function PrivateWorldPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/portal/private-world')

  const { data: profile } = await supabase
    .from('profiles')
    .select('membership_tier')
    .eq('id', user.id)
    .maybeSingle()

  if (tierRank(profile?.membership_tier) < 2) redirect('/subscribe')

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">Private World</h1>
        <p className="mt-3 opacity-70">Beyond the veil.</p>
        <nav className="mt-6 flex justify-center gap-4 text-sm">
          <Link href="/portal" className="hover:text-amber-500">
            The Gallery
          </Link>
          <span className="text-amber-500">Private World</span>
        </nav>
      </header>

      <ContentList tier="private_world" />
    </main>
  )
}
