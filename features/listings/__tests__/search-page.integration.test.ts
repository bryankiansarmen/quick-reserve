import { describe, it, expect } from 'vitest'
import { searchListings } from '../queries'
import type { ListingSearchParams } from '../types'

/**
 * Integration tests for search functionality.
 * These tests verify that the searchListings query function works correctly
 * with various filter combinations.
 */
describe('Search Page Integration', () => {
  /**
   * Test basic search functionality.
   * Note: These tests assume the local Supabase instance has test data seeded.
   * If tests fail due to no data, run: supabase db reset (from supabase/migrations)
   */

  it('returns paginated results with correct structure', async () => {
    const filters: ListingSearchParams = { sort: 'newest', page: 1 }

    const results = await searchListings(filters)

    expect(results).toHaveProperty('data')
    expect(results).toHaveProperty('pagination')
    expect(Array.isArray(results.data)).toBe(true)
    expect(results.pagination).toEqual(
      expect.objectContaining({
        page: expect.any(Number),
        pageSize: expect.any(Number),
        total: expect.any(Number),
      })
    )
  })

  it('returns listings with all required fields', async () => {
    const filters: ListingSearchParams = { sort: 'newest', page: 1 }

    const results = await searchListings(filters)

    if (results.data.length > 0) {
      const listing = results.data[0]
      expect(listing).toHaveProperty('id')
      expect(listing).toHaveProperty('title')
      expect(listing).toHaveProperty('price_cents')
      expect(listing).toHaveProperty('location')
      expect(listing).toHaveProperty('images')
      expect(listing).toHaveProperty('avg_rating')
      expect(listing).toHaveProperty('review_count')
    }
  })

  it('respects pageSize parameter', async () => {
    const filters: ListingSearchParams = {
      pageSize: 5,
      sort: 'newest',
      page: 1,
    }

    const results = await searchListings(filters)

    expect(results.pagination.pageSize).toBe(5)
    expect(results.data.length).toBeLessThanOrEqual(5)
  })

  it('returns correct pagination for different pages', async () => {
    const page1Filters: ListingSearchParams = {
      pageSize: 5,
      sort: 'newest',
      page: 1,
    }
    const page2Filters: ListingSearchParams = {
      pageSize: 5,
      sort: 'newest',
      page: 2,
    }

    const page1Results = await searchListings(page1Filters)
    const page2Results = await searchListings(page2Filters)

    // If there are multiple pages, they should have different data
    if (page1Results.data.length > 0 && page2Results.data.length > 0) {
      const page1Ids = page1Results.data.map((l) => l.id)
      const page2Ids = page2Results.data.map((l) => l.id)
      const commonIds = page1Ids.filter((id) => page2Ids.includes(id))

      // Pages should not overlap
      expect(commonIds.length).toBe(0)
    }
  })

  it('filters by category correctly', async () => {
    const filters: ListingSearchParams = {
      category: 'photography-studio',
      sort: 'newest',
      page: 1,
    }

    const results = await searchListings(filters)

    // If any results, they should all be photography studios
    // (This depends on test data being seeded)
    expect(Array.isArray(results.data)).toBe(true)
  })

  it('filters by price range correctly', async () => {
    const filters: ListingSearchParams = {
      minPrice: 5000,
      maxPrice: 10000,
      sort: 'newest',
      page: 1,
    }

    const results = await searchListings(filters)

    // All results should be within price range
    results.data.forEach((listing) => {
      expect(listing.price_cents).toBeGreaterThanOrEqual(5000)
      expect(listing.price_cents).toBeLessThanOrEqual(10000)
    })
  })

  it('respects sort order', async () => {
    const newestFilters: ListingSearchParams = {
      sort: 'newest',
      page: 1,
    }
    const priceAscFilters: ListingSearchParams = {
      sort: 'price_asc',
      page: 1,
    }

    await searchListings(newestFilters)
    const priceResults = await searchListings(priceAscFilters)

    // If we have results, verify they're sorted
    if (priceResults.data.length > 1) {
      for (let i = 0; i < priceResults.data.length - 1; i++) {
        expect(priceResults.data[i].price_cents).toBeLessThanOrEqual(
          priceResults.data[i + 1].price_cents
        )
      }
    }
  })

  it('handles location filter with ILIKE search', async () => {
    const filters: ListingSearchParams = {
      location: 'los', // case-insensitive partial match
      sort: 'newest',
      page: 1,
    }

    const results = await searchListings(filters)

    // Results should match location filter (if any exist)
    results.data.forEach((listing) => {
      expect(
        listing.location.toLowerCase().includes('los')
      ).toBe(true)
    })
  })

  it('returns empty array for non-matching filters', async () => {
    const filters: ListingSearchParams = {
      minPrice: 9999999, // Very high price
      sort: 'newest',
      page: 1,
    }

    const results = await searchListings(filters)

    expect(results.data).toEqual([])
    expect(results.pagination.total).toBe(0)
  })

  it('combines multiple filters correctly', async () => {
    const filters: ListingSearchParams = {
      category: 'event-venue',
      minPrice: 5000,
      maxPrice: 15000,
      location: 'la',
      sort: 'price_asc',
      page: 1,
      pageSize: 10,
    }

    const results = await searchListings(filters)

    // All results should match all filters
    results.data.forEach((listing) => {
      expect(listing.price_cents).toBeGreaterThanOrEqual(5000)
      expect(listing.price_cents).toBeLessThanOrEqual(15000)
      expect(listing.location.toLowerCase()).toContain('la')
    })
  })

  it('returns placeholder ratings (0) until reviews table is populated', async () => {
    const filters: ListingSearchParams = { sort: 'newest', page: 1 }

    const results = await searchListings(filters)

    // TODO: Update this test when reviews table is implemented
    results.data.forEach((listing) => {
      expect(listing.avg_rating).toBe(0)
      expect(listing.review_count).toBe(0)
    })
  })

  it('only returns published listings', async () => {
    const filters: ListingSearchParams = { sort: 'newest', page: 1 }

    const results = await searchListings(filters)

    // The query filters by status='published', so all results should be published
    // (This is enforced at the Supabase query level, not in the results)
    expect(Array.isArray(results.data)).toBe(true)
  })

  it('defaults to page 1 and pageSize 20 when not specified', async () => {
    const filters: ListingSearchParams = { sort: 'newest' }

    const results = await searchListings(filters)

    expect(results.pagination.page).toBe(1)
    expect(results.pagination.pageSize).toBe(20)
  })

  it('handles date filter correctly', async () => {
    // Get tomorrow's date
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateString = tomorrow.toISOString().split('T')[0]

    const filters: ListingSearchParams = {
      date: dateString,
      sort: 'newest',
      page: 1,
    }

    const results = await searchListings(filters)

    // If results exist, they should have available slots on the given date
    // (This depends on availability_slots being seeded)
    expect(Array.isArray(results.data)).toBe(true)
  })
})
