'use client'

import { ListingCard } from './ListingCard'
import type { PaginatedListingsResponse } from '../types'

interface ListingsGridProps {
  results: PaginatedListingsResponse
  isLoading?: boolean
  onPageChange: (page: number) => void
}

/**
 * ListingsGrid: Displays search results in a responsive grid with pagination.
 *
 * Features:
 * - Responsive grid: 1 col (mobile), 2 (tablet), 3 (desktop), 4 (wide)
 * - Empty state with helpful messaging
 * - Loading skeleton cards (matches actual card layout)
 * - Smart pagination with ellipsis
 * - Result count display
 * - Accessible pagination controls with ARIA labels
 *
 * Used in: Search page
 */
export function ListingsGrid({
  results,
  isLoading,
  onPageChange,
}: ListingsGridProps) {
  const { data, pagination } = results
  const { page, pageSize, total } = pagination
  const totalPages = Math.ceil(total / pageSize)

  // Empty state
  if (!isLoading && data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg
          className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 21l-4.35-4.35m0 0A7.5 7.5 0 103.305 3.305a7.5 7.5 0 0010.345 10.345z"
          />
        </svg>
        <p className="text-lg font-medium text-neutral-900 dark:text-neutral-50 mb-2">
          No listings match your filters
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Try adjusting your search criteria or browse all listings
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Result count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {isLoading ? (
            'Loading...'
          ) : (
            <>
              Showing {((page - 1) * pageSize) + 1}–
              {Math.min(page * pageSize, total)} of {total} listings
            </>
          )}
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: pageSize }).map((_, i) => (
            <SkeletonCard key={i} data-testid="skeleton-card" />
          ))
        ) : (
          data.map((listing) => <ListingCard key={listing.id} listing={listing} />)
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <nav
          className="flex justify-center items-center gap-2 pt-4"
          aria-label="Pagination navigation"
        >
          {/* Previous button */}
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 border border-neutral-300 rounded-md hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-neutral-600 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Previous page"
          >
            Previous
          </button>

          {/* Page numbers */}
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
              // Show first, last, current, and 2 pages around current
              const isVisible =
                pageNum === 1 ||
                pageNum === totalPages ||
                Math.abs(pageNum - page) <= 1

              // Show ellipsis for skipped pages
              if (!isVisible && pageNum === 2 && page > 4) {
                return (
                  <span
                    key={`ellipsis-start-${pageNum}`}
                    className="px-2 text-neutral-500"
                    aria-hidden="true"
                  >
                    …
                  </span>
                )
              }
              if (!isVisible && pageNum === totalPages - 1 && page < totalPages - 3) {
                return (
                  <span
                    key={`ellipsis-end-${pageNum}`}
                    className="px-2 text-neutral-500"
                    aria-hidden="true"
                  >
                    …
                  </span>
                )
              }
              if (!isVisible) return null

              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  disabled={pageNum === page}
                  className={`px-4 py-2 border rounded-md transition-colors ${
                    pageNum === page
                      ? 'bg-primary text-white border-primary'
                      : 'border-neutral-300 hover:bg-neutral-50 dark:border-neutral-600 dark:hover:bg-neutral-800'
                  }`}
                  aria-label={`Page ${pageNum}`}
                  aria-current={pageNum === page ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>

          {/* Next button */}
          <button
            onClick={() => onPageChange(page + 1)}
            disabled={page === totalPages}
            className="px-4 py-2 border border-neutral-300 rounded-md hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed dark:border-neutral-600 dark:hover:bg-neutral-800 transition-colors"
            aria-label="Next page"
          >
            Next
          </button>
        </nav>
      )}
    </div>
  )
}

/**
 * SkeletonCard: Loading placeholder that matches actual ListingCard dimensions.
 * Prevents layout shift during loading (CLS < 0.1).
 */
function SkeletonCard({ ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700 animate-pulse"
      {...props}
    >
      {/* Image skeleton */}
      <div className="aspect-[4/3] bg-neutral-200 dark:bg-neutral-700" />

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Title skeleton */}
        <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />

        {/* Location skeleton */}
        <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />

        {/* Price/Rating row skeleton */}
        <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4" />
      </div>
    </div>
  )
}
