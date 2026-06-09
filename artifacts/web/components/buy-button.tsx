'use client'

import { useState } from 'react'
import { track } from "@/components/analytics";

/** Shared client button: POSTs to /api/stripe/checkout and redirects. */
export function BuyButton({
  payload,
  label,
  featured = false,
  disabled = false,
}: {
  payload: { tier?: string; productId?: string }
  label: string
  featured?: boolean
  disabled?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      track('checkout_started');
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
