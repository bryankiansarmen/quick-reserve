'use client'

import Link from 'next/link'

interface ListingDetailErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

/**
 * Error boundary for listing detail page.
 * Catches and displays errors in a user-friendly way.
 */
export default function ListingDetailError({ error, reset }: ListingDetailErrorProps) {
  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mb-6">
          <svg
            className="w-16 h-16 mx-auto text-danger"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4v2m0 4v2m0-12a9 9 0 110-18 9 9 0 010 18z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
          Something went wrong
        </h1>

        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          We encountered an error while loading this listing. Please try again.
        </p>

        {/* Error details (development only) */}
        {process.env.NODE_ENV === 'development' && error?.message && (
          <div className="mb-6 p-4 rounded-lg bg-danger/10 dark:bg-danger/20 border border-danger/30 text-left">
            <p className="text-xs font-mono text-danger dark:text-danger/80 break-all">
              {error.message}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary-dark transition-colors"
          >
            Try Again
          </button>

          <Link
            href="/search"
            className="px-6 py-2 rounded-lg bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 font-medium hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors"
          >
            Back to Search
          </Link>
        </div>
      </div>
    </div>
  )
}
