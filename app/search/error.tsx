'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function SearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log error to monitoring service
    console.error('[SearchPage Error]:', error.message)
  }, [error])

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-8 text-center shadow-sm">
        {/* Error Icon */}
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-danger"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error Message */}
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
          Something went wrong
        </h2>

        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          We couldn&apos;t load the search results. Please try again.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2 bg-primary text-white rounded-md hover:bg-primary-dark transition-colors font-medium"
          >
            Try Again
          </button>

          <Link
            href="/"
            className="px-6 py-2 border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-neutral-50 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors font-medium"
          >
            Go Home
          </Link>
        </div>

        {/* Error Details (dev only) */}
        {process.env.NODE_ENV === 'development' && error.message && (
          <details className="mt-6 text-left">
            <summary className="text-sm text-neutral-500 cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-300 font-medium">
              Error details (development only)
            </summary>
            <pre className="mt-2 text-xs text-danger bg-danger/10 p-3 rounded overflow-auto max-h-40 whitespace-pre-wrap break-words font-mono">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
