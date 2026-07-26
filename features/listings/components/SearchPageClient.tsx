'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SearchFilters } from './SearchFilters'
import { ListingsGrid } from './ListingsGrid'
import type { PaginatedListingsResponse, ListingSearchParams } from '../types'

interface SearchPageClientProps {
  initialData: PaginatedListingsResponse
  initialFilters: ListingSearchParams
}

/**
 * SearchPageClient: Client-side wrapper that manages filter state and result fetching.
 *
 * Responsibilities:
 * - Maintain filter state (updated by SearchFilters)
 * - Fetch results from /api/listings when filters change
 * - Update URL to reflect current filters (shareable links)
 * - Handle loading and error states
 * - Coordinate between filter panel and results grid
 *
 * Used in: Search page
 */
export function SearchPageClient({
  initialData,
  initialFilters,
}: SearchPageClientProps) {
  const router = useRouter()
  const [results, setResults] = useState(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch listings from the API with current filters.
   * Updates URL and results state.
   */
  const fetchResults = useCallback(
    async (filters: ListingSearchParams) => {
      setIsLoading(true)
      setError(null)

      try {
        // Build query string from filters
        const params = new URLSearchParams()
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.set(key, String(value))
          }
        })

        // Update URL (enables shareable/bookmarkable links)
        router.push(`/search?${params.toString()}`, { scroll: false })

        // Fetch results from API
        const response = await fetch(`/api/listings?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch listings')
        }

        const data: PaginatedListingsResponse = await response.json()
        setResults(data)
      } catch (err) {
        console.error('Search error:', err)
        setError('Failed to load listings. Please try again.')
      } finally {
        setIsLoading(false)
      }
    },
    [router]
  )

  /**
   * Handle filter changes from SearchFilters component.
   * Triggers API fetch and URL update.
   */
  const handleFilterChange = useCallback(
    (filters: ListingSearchParams) => {
      fetchResults(filters)
    },
    [fetchResults]
  )

  /**
   * Handle pagination - fetch new page and scroll to top.
   */
  const handlePageChange = useCallback(
    (newPage: number) => {
      const filters = {
        ...initialFilters,
        page: newPage,
      }
      fetchResults(filters)

      // Scroll to top on page change for better UX
      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [initialFilters, fetchResults]
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      {/* Sidebar filters (visible on desktop, accessible on mobile) */}
      <aside className="lg:col-span-1">
        <div className="sticky top-4">
          <SearchFilters
            initialFilters={initialFilters}
            onFilterChange={handleFilterChange}
            isLoading={isLoading}
          />
        </div>
      </aside>

      {/* Results main content */}
      <main className="lg:col-span-3">
        {/* Error state */}
        {error && (
          <div className="mb-6 p-4 bg-danger/10 border border-danger rounded-lg">
            <p className="text-danger font-medium">{error}</p>
            <button
              onClick={() => fetchResults(initialFilters)}
              className="mt-2 text-sm text-danger hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Results grid with pagination */}
        <ListingsGrid
          results={results}
          isLoading={isLoading}
          onPageChange={handlePageChange}
        />
      </main>
    </div>
  )
}
