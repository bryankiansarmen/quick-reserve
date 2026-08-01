'use client'

import { useState, useCallback, useEffect } from 'react'
import { CATEGORY_OPTIONS } from '@/lib/constants/categories'
import { dollarsToCents } from '@/lib/utils/currency'
import { searchQuerySchema, type ListingCategory } from '@/features/listings/validation'
import type { ListingSearchParams } from '@/features/listings/types'

interface SearchFiltersProps {
  initialFilters: ListingSearchParams
  onFilterChange: (filters: ListingSearchParams) => void
  isLoading?: boolean
}

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

  useEffect(() => {
    const timer = setTimeout(() => {
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
        page: 1,
      }

      const result = searchQuerySchema.safeParse(filters)
      if (result.success) {
        onFilterChange(result.data)
      }
    }, 300)

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

  const minDate = new Date().toISOString().split('T')[0]

  return (
    <div className="space-y-6 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">
          Filters
        </h2>
        <button
          type="button"
          onClick={handleReset}
          disabled={isLoading}
          className="text-sm text-slate-700 dark:text-slate-300 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Reset all filters"
        >
          Reset
        </button>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="category"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-slate-900 dark:border-slate-600 dark:text-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
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

      <div className="space-y-2">
        <label
          htmlFor="location"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
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
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-slate-900 dark:border-slate-600 dark:text-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Filter by location"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Price Range ($/hour)
        </legend>
        <div className="grid grid-cols-2 gap-2">
          <label htmlFor="minPrice" className="sr-only">
            Minimum price
          </label>
          <input
            id="minPrice"
            type="number"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            placeholder="Min"
            min="0"
            step="1"
            disabled={isLoading}
            className="px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-slate-900 dark:border-slate-600 dark:text-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Minimum price"
          />
          <label htmlFor="maxPrice" className="sr-only">
            Maximum price
          </label>
          <input
            id="maxPrice"
            type="number"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            placeholder="Max"
            min="0"
            step="1"
            disabled={isLoading}
            className="px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-slate-900 dark:border-slate-600 dark:text-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Maximum price"
          />
        </div>
      </fieldset>

      <div className="space-y-2">
        <label
          htmlFor="date"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
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
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-slate-900 dark:border-slate-600 dark:text-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Filter by available date"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="sort"
          className="block text-sm font-medium text-slate-700 dark:text-slate-300"
        >
          Sort By
        </label>
        <select
          id="sort"
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-slate-900 dark:border-slate-600 dark:text-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
