'use client'

import { useEffect } from 'react'

/**
 * Checkout error boundary. Network errors or unexpected failures during page
 * load render a full-page error with a retry, per the design system's error
 * state guidance.
 */
export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[checkout] error boundary:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-4">
          Something went wrong
        </h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          We couldn&apos;t load this checkout page. Please try again.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={reset}
            className="flex-1 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
          >
            Try again
          </button>
          <a
            href="/search"
            className="flex-1 px-6 py-3 rounded-lg border border-neutral-300 dark:border-neutral-600 text-neutral-700 dark:text-neutral-300 font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            Back to search
          </a>
        </div>
      </div>
    </div>
  )
}
