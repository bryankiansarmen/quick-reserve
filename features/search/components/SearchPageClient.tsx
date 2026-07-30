'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { SearchFilters } from './SearchFilters'
import { ListingsGrid } from './ListingsGrid'
import type { PaginatedListingsResponse, ListingSearchParams } from '@/features/listings/types'

interface SearchPageClientProps {
  initialData: PaginatedListingsResponse
  initialFilters: ListingSearchParams
}

export function SearchPageClient({
  initialData,
  initialFilters,
}: SearchPageClientProps) {
  const router = useRouter()
  const [results, setResults] = useState(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchResults = useCallback(
    async (filters: ListingSearchParams) => {
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.set(key, String(value))
          }
        })

        router.push(`/search?${params.toString()}`, { scroll: false })

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

  const handleFilterChange = useCallback(
    (filters: ListingSearchParams) => {
      fetchResults(filters)
    },
    [fetchResults]
  )

  const handlePageChange = useCallback(
    (newPage: number) => {
      const filters = {
        ...initialFilters,
        page: newPage,
      }
      fetchResults(filters)

      window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [initialFilters, fetchResults]
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
      <aside className="lg:col-span-1">
        <div className="sticky top-4">
          <SearchFilters
            initialFilters={initialFilters}
            onFilterChange={handleFilterChange}
            isLoading={isLoading}
          />
        </div>
      </aside>

      <main className="lg:col-span-3">
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

        <ListingsGrid
          results={results}
          isLoading={isLoading}
          onPageChange={handlePageChange}
        />
      </main>
    </div>
  )
}
