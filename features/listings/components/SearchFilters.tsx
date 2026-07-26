'use client'

import { useState, useCallback, useEffect } from 'react'
import { CATEGORY_OPTIONS } from '@/lib/constants/categories'
import { dollarsToCents } from '@/lib/utils/currency'
import { searchQuerySchema, type ListingCategory } from '../validation'
import type { ListingSearchParams } from '../types'

interface SearchFiltersProps {
  initialFilters: ListingSearchParams
  onFilterChange: (filters: ListingSearchParams) => void
  isLoading?: boolean
}

/**
 * SearchFilters: Client component for filtering listings.
 *
 * Features:
 * - Category dropdown, location text input, price range, date picker, sort dropdown
 * - Debounced updates (300ms) to avoid excessive API calls
 * - Client-side validation with searchQuerySchema
 * - Reset button to clear all filters
 * - Disabled state during loading
 * - Accessible labels and form structure
 *
 * Used in: Search page
 */
export function SearchFilters({
  initialFilters,
  onFilterChange,
  isLoading = false,
}: SearchFiltersProps) {
  const [category, setCategory] = useState(initialFilters.category || '')
  const [location, setLocation] = useState(initialFilters.location || '')
  const [minPrice, setMinPrice] = useState(
    initialFilters.minPrice ? (initialFilters.minPrice / 100).toString() : ''
  )
  const [maxPrice, setMaxPrice] = useState(
    initialFilters.maxPrice ? (initialFilters.maxPrice / 100).toString() : ''
  )
  const [date, setDate] = useState(initialFilters.date || '')
  const [sort, setSort] = useState(initialFilters.sort || 'newest')

  // Debounced filter update
  useEffect(() => {
    const timer = setTimeout(() => {
      // Convert dollars to cents
      const minPriceCents = minPrice ? dollarsToCents(minPrice) : undefined
      const maxPriceCents = maxPrice ? dollarsToCents(maxPrice) : undefined

      const filters: ListingSearchParams = {
        ...(category && { category: category as ListingCategory }),
        ...(location && { location }),
        ...(minPriceCents !== null && minPriceCents !== undefined && {
          minPrice: minPriceCents,
        }),
        ...(maxPriceCents !== null && maxPriceCents !== undefined && {
          maxPrice: maxPriceCents,
        }),
        ...(date && { date }),
        sort: sort as typeof sort,
        page: 1, // Reset to page 1 on filter change
      }

      // Validate before sending
      const result = searchQuerySchema.safeParse(filters)
      if (result.success) {
        onFilterChange(result.data)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [category, location, minPrice, maxPrice, date, sort, onFilterChange])

  const handleReset = useCallback(() => {
    setCategory('')
    setLocation('')
    setMinPrice('')
    setMaxPrice('')
    setDate('')
    setSort('newest')
    onFilterChange({ sort: 'newest', page: 1 })
  }, [onFilterChange])

  // Get minimum date (today)
  const minDate = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6 p-6 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
      {/* Header with Reset button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
          Filters
        </h2>
        <button
          type="button"
          onClick={handleReset}
          disabled={isLoading}
          className="text-sm text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Reset all filters"
        >
          Reset
        </button>
      </div>

      {/* Category Filter */}
      <div className="space-y-2">
        <label
          htmlFor="category"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-neutral-900 dark:border-neutral-600 dark:text-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Location Filter */}
      <div className="space-y-2">
        <label
          htmlFor="location"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Location
        </label>
        <input
          type="text"
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Enter city or area"
          disabled={isLoading}
          className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-neutral-900 dark:border-neutral-600 dark:text-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Filter by location"
        />
      </div>

      {/* Price Range Filter */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Price Range ($/hour)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min"
            min="0"
            step="1"
            disabled={isLoading}
            className="px-3 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-neutral-900 dark:border-neutral-600 dark:text-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Minimum price"
          />
          <input
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max"
            min="0"
            step="1"
            disabled={isLoading}
            className="px-3 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-neutral-900 dark:border-neutral-600 dark:text-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Maximum price"
          />
        </div>
      </div>

      {/* Date Filter */}
      <div className="space-y-2">
        <label
          htmlFor="date"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Available Date
        </label>
        <input
          type="date"
          id="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          min={minDate}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-neutral-900 dark:border-neutral-600 dark:text-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Filter by available date"
        />
      </div>

      {/* Sort Filter */}
      <div className="space-y-2">
        <label
          htmlFor="sort"
          className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
        >
          Sort By
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-neutral-900 dark:border-neutral-600 dark:text-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Sort results by"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="rating_desc">Highest Rated</option>
        </select>
      </div>
    </div>
  )
}
