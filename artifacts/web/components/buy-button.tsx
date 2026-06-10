'use client'

import { useState } from 'react'
import { track } from "@/components/analytics";

/** Shared client button: POSTs to /api/stripe/checkout and redirects. */
export function BuyButton({
  payload,
  label,
  featured = false,
  disabled = false,
  terms = false,
}: {
  payload: { tier?: string; productId?: string }
  label: string
  featured?: boolean
  disabled?: boolean
  terms?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [term, setTerm] = useState<'monthly' | 'quarter' | 'biannual'>('monthly')
  const TERMS = [
    { v: 'monthly' as const, l: 'Monthly', save: '' },
    { v: 'quarter' as const, l: '3 months', save: 'save 15%' },
    { v: 'biannual' as const, l: '6 months', save: 'save 25%' },
  ]

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      track('checkout_started');
      const offer = typeof window !== 'undefined' ? sessionStorage.getItem('ww_offer') ?? undefined : undefined
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, offer, term }),
      })
      const data = await res.json()

      if (res.status === 409 && data.redirect) {
        window.location.href = data.redirect
        return
      }
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Something went wrong')
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div>
      {terms && payload.tier && (
        <div className="mb-3 grid grid-cols-3 gap-1 rounded-full border border-neutral-700 p-1">
          {TERMS.map((t) => (
            <button key={t.v} type="button" onClick={() => setTerm(t.v)}
              className={`rounded-full px-2 py-1.5 text-[11px] font-medium transition ${term === t.v ? 'bg-amber-500 text-black' : 'text-neutral-300 hover:text-amber-400'}`}>
              {t.l}{t.save ? <span className="block text-[9px] opacity-80">{t.save}</span> : null}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={handleClick}
        disabled={loading || disabled}
        className={`w-full rounded-full px-6 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
          featured
            ? 'bg-amber-500 text-black hover:bg-amber-400'
            : 'border border-neutral-500 hover:border-amber-500 hover:text-amber-500'
        }`}
      >
        {loading ? 'Opening checkout…' : label}
      </button>
      {error && (
        <p className="mt-2 text-center text-xs text-red-400">{error}</p>
      )}
    </div>
  )
}
