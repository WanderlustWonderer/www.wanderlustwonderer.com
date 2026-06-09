import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export const metadata = {
  title: "Thank you",
  description: "Your offering has been received.",
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic'

/**
 * One-off purchase success. The webhook records the order (and booking row
 * for live sessions) — usually within a second or two.
 */
export default async function CollectionSuccessPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <main className="mx-auto flex max-w-xl flex-col items-center px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">
        Your tribute is received.
      </h1>
      <p className="mt-4 opacity-70">
        Thank you. If you claimed a live session, the Muse will reach out
        personally to arrange the moment. Your order appears in your account
        shortly.
      </p>
      <div className="mt-10 flex gap-4">
        <Link
          href="/account"
          className="rounded-full bg-amber-500 px-6 py-3 text-sm font-medium text-black hover:bg-amber-400"
        >
          Your account
        </Link>
        <Link
          href="/collection"
          className="rounded-full border border-neutral-500 px-6 py-3 text-sm hover:border-amber-500"
        >
          Back to The Collection
        </Link>
      </div>
    </main>
  )
}
