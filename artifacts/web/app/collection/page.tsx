import { createClient } from '@/utils/supabase/server'
import { BuyButton } from '@/components/buy-button'
import { SiteNav } from '@/components/site-nav'
import { SiteFooter } from '@/components/site-footer'

export const dynamic = 'force-dynamic'

function formatGbp(pence: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: pence % 100 === 0 ? 0 : 2,
  }).format(pence / 100)
}

export default async function CollectionPage() {
  const supabase = await createClient()
  // RLS: active products are publicly readable.
  const { data: products } = await supabase
    .from('products')
    .select('id, name, description, price, product_type')
    .eq('active', true)
    .order('price', { ascending: false })

  return (
    <div className="bg-black text-neutral-100 min-h-screen">
    <SiteNav />
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-semibold tracking-tight">The Collection</h1>
        <p className="mt-3 text-lg opacity-70">
          Tributes, gifts, and moments with the Muse.
        </p>
      </header>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(products ?? []).map((product) => (
          <div
            key={product.id}
            className="flex flex-col rounded-2xl border border-neutral-700 p-6"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold">{product.name}</h2>
              <span className="whitespace-nowrap text-lg font-semibold text-amber-500">
                {formatGbp(product.price)}
              </span>
            </div>
            {product.product_type === 'booking' && (
              <span className="mt-2 w-fit rounded-full border border-amber-500/50 px-3 py-0.5 text-xs uppercase tracking-wide text-amber-500">
                Live session
              </span>
            )}
            <p className="mt-3 flex-1 text-sm opacity-70">
              {product.description}
            </p>
            <div className="mt-6">
              <BuyButton
                payload={{ productId: product.id }}
                label="Claim"
                featured={product.product_type === 'booking'}
              />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-10 text-center text-xs opacity-50">
        Live sessions are arranged personally after purchase. Payments
        processed securely by Stripe.
      </p>
    </main>
    <SiteFooter />
    </div>
  )
}
