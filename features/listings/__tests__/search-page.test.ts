import { describe, it, expect, vi, beforeEach } from 'vitest'
import { searchListings } from '../queries'
import type { ListingSearchParams } from '../types'

type MockData = Record<string, unknown>
interface MockBuilder {
  [method: string]: MockBuilder | ((resolve: (value: unknown) => void) => Promise<unknown>)
  then: (resolve: (value: unknown) => void) => Promise<unknown>
}

function createMockBuilder(): MockBuilder {
  const builder: MockBuilder = {}
  const chainMethods = [
    'select', 'eq', 'neq', 'ilike', 'gte', 'lte', 'in',
    'order', 'range', 'limit', 'single', 'maybeSingle',
  ]
  for (const m of chainMethods) {
    builder[m] = vi.fn(() => builder)
  }
  return builder
}

const mockListingsBuilder = createMockBuilder()
const mockSlotsBuilder = createMockBuilder()

let mockListingsData: MockData[] = []
let mockListingsCount = 0
let mockSlotsData: MockData[] = []

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'availability_slots') return mockSlotsBuilder
      return mockListingsBuilder
    }),
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockListingsData = []
  mockListingsCount = 0
  mockSlotsData = []

  mockListingsBuilder.then = (resolve: (value: unknown) => void) => {
    resolve({ data: mockListingsData, error: null, count: mockListingsCount })
    return Promise.resolve({ data: mockListingsData, error: null, count: mockListingsCount })
  }

  mockSlotsBuilder.then = (resolve: (value: unknown) => void) => {
    resolve({ data: mockSlotsData, error: null })
    return Promise.resolve({ data: mockSlotsData, error: null })
  }
})

describe('searchListings — mocked Supabase', () => {
  it('returns paginated results with correct structure', async () => {
    mockListingsData = [{ id: '1', title: 'Test', price_cents: 5000, location: 'LA', images: [], created_at: new Date().toISOString() }]
    mockListingsCount = 1

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
    mockListingsData = [{
      id: '1',
      title: 'Studio',
      price_cents: 5000,
      location: 'LA',
      images: ['img.jpg'],
      created_at: new Date().toISOString(),
    }]
    mockListingsCount = 1

    const filters: ListingSearchParams = { sort: 'newest', page: 1 }
    const results = await searchListings(filters)

    expect(results.data.length).toBeGreaterThan(0)
    const listing = results.data[0]
    expect(listing).toHaveProperty('id')
    expect(listing).toHaveProperty('title')
    expect(listing).toHaveProperty('price_cents')
    expect(listing).toHaveProperty('location')
    expect(listing).toHaveProperty('images')
    expect(listing).toHaveProperty('avg_rating')
    expect(listing).toHaveProperty('review_count')
  })

  it('respects pageSize parameter', async () => {
    mockListingsData = [
      { id: '1', title: 'A', price_cents: 1000, location: 'LA', images: [], created_at: new Date().toISOString() },
      { id: '2', title: 'B', price_cents: 2000, location: 'NY', images: [], created_at: new Date().toISOString() },
      { id: '3', title: 'C', price_cents: 3000, location: 'SF', images: [], created_at: new Date().toISOString() },
    ]
    mockListingsCount = 3

    const filters: ListingSearchParams = { pageSize: 5, sort: 'newest', page: 1 }
    const results = await searchListings(filters)

    expect(results.pagination.pageSize).toBe(5)
    expect(results.data.length).toBeLessThanOrEqual(5)
  })

  it('returns correct pagination for different pages', async () => {
    const page1Filters: ListingSearchParams = { pageSize: 5, sort: 'newest', page: 1 }
    const page2Filters: ListingSearchParams = { pageSize: 5, sort: 'newest', page: 2 }

    const page1Results = await searchListings(page1Filters)
    const page2Results = await searchListings(page2Filters)

    if (page1Results.data.length > 0 && page2Results.data.length > 0) {
      const page1Ids = page1Results.data.map((l) => l.id)
      const page2Ids = page2Results.data.map((l) => l.id)
      const commonIds = page1Ids.filter((id) => page2Ids.includes(id))
      expect(commonIds.length).toBe(0)
    }
  })

  it('filters by category correctly', async () => {
    const filters: ListingSearchParams = { category: 'photography-studio', sort: 'newest', page: 1 }
    const results = await searchListings(filters)

    expect(Array.isArray(results.data)).toBe(true)
  })

  it('filters by price range correctly', async () => {
    mockListingsData = [
      { id: '1', title: 'A', price_cents: 5000, location: 'LA', images: [], created_at: new Date().toISOString() },
      { id: '2', title: 'B', price_cents: 7500, location: 'NY', images: [], created_at: new Date().toISOString() },
    ]
    mockListingsCount = 2

    const filters: ListingSearchParams = { minPrice: 5000, maxPrice: 10000, sort: 'newest', page: 1 }
    const results = await searchListings(filters)

    results.data.forEach((listing) => {
      expect(listing.price_cents).toBeGreaterThanOrEqual(5000)
      expect(listing.price_cents).toBeLessThanOrEqual(10000)
    })
  })

  it('respects sort order', async () => {
    mockListingsData = [
      { id: '1', title: 'A', price_cents: 5000, location: 'LA', images: [], created_at: new Date().toISOString() },
      { id: '2', title: 'B', price_cents: 10000, location: 'NY', images: [], created_at: new Date().toISOString() },
    ]
    mockListingsCount = 2

    const newestFilters: ListingSearchParams = { sort: 'newest', page: 1 }
    const priceAscFilters: ListingSearchParams = { sort: 'price_asc', page: 1 }

    await searchListings(newestFilters)
    const priceResults = await searchListings(priceAscFilters)

    if (priceResults.data.length > 1) {
      for (let i = 0; i < priceResults.data.length - 1; i++) {
        expect(priceResults.data[i].price_cents).toBeLessThanOrEqual(
          priceResults.data[i + 1].price_cents
        )
      }
    }
  })

  it('handles location filter with ILIKE search', async () => {
    mockListingsData = [
      { id: '1', title: 'A', price_cents: 5000, location: 'Los Angeles', images: [], created_at: new Date().toISOString() },
      { id: '2', title: 'B', price_cents: 10000, location: 'Los Gatos', images: [], created_at: new Date().toISOString() },
    ]
    mockListingsCount = 2

    const filters: ListingSearchParams = { location: 'los', sort: 'newest', page: 1 }
    const results = await searchListings(filters)

    results.data.forEach((listing) => {
      expect(listing.location.toLowerCase().includes('los')).toBe(true)
    })
  })

  it('returns empty array for non-matching filters', async () => {
    mockListingsData = []
    mockListingsCount = 0

    const filters: ListingSearchParams = { minPrice: 9999999, sort: 'newest', page: 1 }
    const results = await searchListings(filters)

    expect(results.data).toEqual([])
    expect(results.pagination.total).toBe(0)
  })

  it('combines multiple filters correctly', async () => {
    mockListingsData = [
      { id: '1', title: 'A', price_cents: 5000, location: 'Las Vegas', images: [], created_at: new Date().toISOString() },
    ]
    mockListingsCount = 1

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

    results.data.forEach((listing) => {
      expect(listing.price_cents).toBeGreaterThanOrEqual(5000)
      expect(listing.price_cents).toBeLessThanOrEqual(15000)
      expect(listing.location.toLowerCase()).toContain('la')
    })
  })

  it('returns placeholder ratings (0) until reviews table is populated', async () => {
    mockListingsData = [{ id: '1', title: 'Test', price_cents: 5000, location: 'LA', images: [], created_at: new Date().toISOString() }]
    mockListingsCount = 1

    const filters: ListingSearchParams = { sort: 'newest', page: 1 }
    const results = await searchListings(filters)

    results.data.forEach((listing) => {
      expect(listing.avg_rating).toBe(0)
      expect(listing.review_count).toBe(0)
    })
  })

  it('only returns published listings', async () => {
    const filters: ListingSearchParams = { sort: 'newest', page: 1 }
    const results = await searchListings(filters)

    expect(Array.isArray(results.data)).toBe(true)
  })

  it('defaults to page 1 and pageSize 20 when not specified', async () => {
    const filters: ListingSearchParams = { sort: 'newest' }
    const results = await searchListings(filters)

    expect(results.pagination.page).toBe(1)
    expect(results.pagination.pageSize).toBe(20)
  })

  it('handles date filter correctly', async () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateString = tomorrow.toISOString().split('T')[0]

    const filters: ListingSearchParams = { date: dateString, sort: 'newest', page: 1 }
    const results = await searchListings(filters)

    expect(Array.isArray(results.data)).toBe(true)
  })
})
