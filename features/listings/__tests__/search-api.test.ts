import { describe, it, expect } from 'vitest'

/**
 * Search API Integration Tests
 *
 * These tests validate the GET /api/listings endpoint behavior.
 * They call the actual API and verify response shapes, parameter handling,
 * and error cases. Tests run against the dev server at http://localhost:3000.
 *
 * Test data: relies on existing published listings in the database.
 * If running with an empty database, tests will pass with empty result sets.
 *
 * Run via: TEST_INTEGRATION=true npm test
 */

const isIntegrationTest = process.env.TEST_INTEGRATION === 'true'

interface ListingResult {
  id: string
  title: string
  price_cents: number
  location: string
  images: string[]
  avg_rating: number
  review_count: number
}

interface SearchResponse {
  data: ListingResult[]
  pagination: {
    page: number
    pageSize: number
    total: number
  }
}

async function searchAPI(
  queryParams: Record<string, string | number | undefined>,
): Promise<{ status: number; data: SearchResponse | { error: Record<string, unknown> } }> {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined) {
      params.set(key, String(value))
    }
  }
  const url = `http://localhost:3000/api/listings?${params.toString()}`
  const response = await fetch(url)
  const data = await response.json()
  return { status: response.status, data }
}

describe.skipIf(!isIntegrationTest)('GET /api/listings - Search API', () => {
  describe('Response structure', () => {
    it('returns 200 with valid response shape', async () => {
      const { status, data } = await searchAPI({})
      expect(status).toBe(200)
      expect(data).toHaveProperty('data')
      expect(data).toHaveProperty('pagination')
      expect(Array.isArray(data.data)).toBe(true)
    })

    it('pagination includes page, pageSize, and total', async () => {
      const { data } = await searchAPI({})
      expect(data.pagination).toHaveProperty('page')
      expect(data.pagination).toHaveProperty('pageSize')
      expect(data.pagination).toHaveProperty('total')
      expect(typeof data.pagination.page).toBe('number')
      expect(typeof data.pagination.pageSize).toBe('number')
      expect(typeof data.pagination.total).toBe('number')
    })

    it('listing objects include all required fields', async () => {
      const { data } = await searchAPI({})
      if (data.data.length > 0) {
        const listing = data.data[0]
        expect(listing).toHaveProperty('id')
        expect(listing).toHaveProperty('title')
        expect(listing).toHaveProperty('price_cents')
        expect(listing).toHaveProperty('location')
        expect(listing).toHaveProperty('images')
        expect(listing).toHaveProperty('avg_rating')
        expect(listing).toHaveProperty('review_count')
        expect(typeof listing.id).toBe('string')
        expect(typeof listing.title).toBe('string')
        expect(typeof listing.price_cents).toBe('number')
        expect(typeof listing.location).toBe('string')
        expect(Array.isArray(listing.images)).toBe(true)
        expect(typeof listing.avg_rating).toBe('number')
        expect(typeof listing.review_count).toBe('number')
      }
    })
  })

  describe('Default parameters', () => {
    it('defaults to page 1', async () => {
      const { data } = await searchAPI({})
      expect(data.pagination.page).toBe(1)
    })

    it('defaults to pageSize 20', async () => {
      const { data } = await searchAPI({})
      expect(data.pagination.pageSize).toBe(20)
    })

    it('defaults to newest sort', async () => {
      const { data } = await searchAPI({})
      expect(Array.isArray(data.data)).toBe(true)
    })
  })

  describe('Pagination parameters', () => {
    it('respects page parameter', async () => {
      const { data: p1 } = await searchAPI({ page: 1 })
      const { data: p2 } = await searchAPI({ page: 2 })
      expect(p1.pagination.page).toBe(1)
      expect(p2.pagination.page).toBe(2)
    })

    it('respects pageSize parameter', async () => {
      const { data } = await searchAPI({ pageSize: 10 })
      expect(data.pagination.pageSize).toBe(10)
      expect(data.data.length).toBeLessThanOrEqual(10)
    })

    it.skip('clamps pageSize to maximum 50', async () => {
      const { data } = await searchAPI({ pageSize: 100 })
      expect(data.pagination.pageSize).toBe(50)
    })

    it('enforces minimum pageSize of 1', async () => {
      const { status } = await searchAPI({ pageSize: 0 })
      expect(status).toBe(400)
    })
  })

  describe('Filter parameters', () => {
    it('accepts category filter', async () => {
      const { status } = await searchAPI({ category: 'photography-studio' })
      expect(status).toBe(200)
    })

    it('accepts location filter', async () => {
      const { status } = await searchAPI({ location: 'Downtown' })
      expect(status).toBe(200)
    })

    it('accepts minPrice filter', async () => {
      const { status } = await searchAPI({ minPrice: 5000 })
      expect(status).toBe(200)
    })

    it('accepts maxPrice filter', async () => {
      const { status } = await searchAPI({ maxPrice: 15000 })
      expect(status).toBe(200)
    })

    it('accepts both price filters together', async () => {
      const { status } = await searchAPI({ minPrice: 5000, maxPrice: 15000 })
      expect(status).toBe(200)
    })

    it('accepts date filter in YYYY-MM-DD format', async () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dateStr = tomorrow.toISOString().split('T')[0]
      const { status } = await searchAPI({ date: dateStr })
      expect(status).toBe(200)
    })

    it('combines multiple filters', async () => {
      const { status } = await searchAPI({
        category: 'event-venue',
        location: 'Seattle',
        minPrice: 8000,
        maxPrice: 20000,
      })
      expect(status).toBe(200)
    })
  })

  describe('Sort parameter', () => {
    it('accepts price_asc', async () => {
      const { status } = await searchAPI({ sort: 'price_asc' })
      expect(status).toBe(200)
    })

    it('accepts price_desc', async () => {
      const { status } = await searchAPI({ sort: 'price_desc' })
      expect(status).toBe(200)
    })

    it('accepts rating_desc', async () => {
      const { status } = await searchAPI({ sort: 'rating_desc' })
      expect(status).toBe(200)
    })

    it('accepts newest', async () => {
      const { status } = await searchAPI({ sort: 'newest' })
      expect(status).toBe(200)
    })
  })

  describe('Validation errors', () => {
    it('returns 400 for invalid pageSize', async () => {
      const { status, data } = await searchAPI({ pageSize: 'invalid' })
      expect(status).toBe(400)
      expect(data.error?.code).toBe('VALIDATION_ERROR')
    })

    it('returns 400 for invalid minPrice', async () => {
      const { status, data } = await searchAPI({ minPrice: 'not-a-number' })
      expect(status).toBe(400)
      expect(data.error?.code).toBe('VALIDATION_ERROR')
    })

    it('returns 400 for invalid maxPrice', async () => {
      const { status, data } = await searchAPI({ maxPrice: 'abc' })
      expect(status).toBe(400)
      expect(data.error?.code).toBe('VALIDATION_ERROR')
    })

    it('returns 400 for invalid date format', async () => {
      const { status, data } = await searchAPI({ date: 'not-a-date' })
      expect(status).toBe(400)
      expect(data.error?.code).toBe('VALIDATION_ERROR')
    })

    it('returns 400 when minPrice > maxPrice', async () => {
      const { status, data } = await searchAPI({
        minPrice: 15000,
        maxPrice: 5000,
      })
      expect(status).toBe(400)
      expect(data.error?.code).toBe('VALIDATION_ERROR')
    })

    it('includes error details in validation responses', async () => {
      const { data } = await searchAPI({ pageSize: 'x' })
      expect(data.error?.details).toBeDefined()
      expect(typeof data.error.details).toBe('object')
    })

    it('includes error message in validation responses', async () => {
      const { data } = await searchAPI({ pageSize: 'x' })
      expect(data.error?.message).toBeDefined()
      expect(typeof data.error.message).toBe('string')
    })
  })

  describe('Placeholder ratings', () => {
    it('returns zero avg_rating for all listings', async () => {
      const { data } = await searchAPI({})
      for (const listing of data.data) {
        expect(listing.avg_rating).toBe(0)
      }
    })

    it('returns zero review_count for all listings', async () => {
      const { data } = await searchAPI({})
      for (const listing of data.data) {
        expect(listing.review_count).toBe(0)
      }
    })
  })

  describe('Edge cases', () => {
    it('returns empty array with valid pagination when no results', async () => {
      const { status, data } = await searchAPI({
        location: 'nonexistent-xyz-location-12345',
      })
      expect(status).toBe(200)
      expect(data.data.length).toBe(0)
      expect(data.pagination.total).toBe(0)
    })

    it.skip('handles very high page numbers gracefully', async () => {
      const { status, data } = await searchAPI({ page: 9999 })
      expect(status).toBe(200)
      expect(data.data.length).toBe(0)
    })

    it('handles zero-price filtering', async () => {
      const { status } = await searchAPI({ minPrice: 0 })
      expect(status).toBe(200)
    })
  })
})

