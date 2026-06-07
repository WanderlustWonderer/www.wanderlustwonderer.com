import { createClient } from '@/utils/supabase/server'
import type { Database } from '@/types/database'

type Tier = Database['public']['Enums']['membership_tier']

const TYPE_LABEL: Record<string, string> = {
  video: 'Video',
  gallery: 'Gallery',
  post: 'Post',
}

/**
 * Server component: lists published content for a tier section.
 * Uses the user-scoped client — RLS only returns rows the member's tier
 * allows, so this can never leak higher-tier content even if middleware
 * is misconfigured.
 */
export async function ContentList({ tier }: { tier: Tier }) {
  const supabase = await createClient()
  const { data: items } = await supabase
    .from('content_items')
    .select('id, title, content_type, body, published_at')
    .eq('min_tier', tier)
    .order('published_at', { ascending: false })

  if (!items || items.length === 0) {
    return (
      <p className="py-16 text-center opacity-50">
        Nothing here yet. The Muse is composing…
      </p>
    )
  }

  return (
    <div className="space-y-8">
      {items.map((item) => (
        <article
          key={item.id}
          className="rounded-2xl border border-neutral-700 p-8"
        >
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-amber-500/50 px-3 py-0.5 text-xs uppercase tracking-wide text-amber-500">
              {TYPE_LABEL[item.content_type] ?? item.content_type}
            </span>
            {item.published_at && (
              <time className="text-xs opacity-50">
                {new Date(item.published_at).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </time>
            )}
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">
            {item.title}
          </h2>
          {item.body && (
            <div className="prose prose-invert mt-4 max-w-none whitespace-pre-wrap opacity-90">
              {item.body}
            </div>
          )}
        </article>
      ))}
    </div>
  )
}
