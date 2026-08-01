import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import { getFeaturedListings, getCategoryCounts } from '../queries'

type MockData = Record<string, unknown>

const chainMethods = [
  'select', 'eq', 'neq', 'ilike', 'gte', 'lte', 'in',
  'order', 'range', 'limit', 'single', 'maybeSingle',
] as const
type ChainMethodName = (typeof chainMethods)[number]

type MockBuilder = Record<ChainMethodName, Mock<(...args: unknown[]) => MockBuilder>> & {
  then?: (resolve: (value: unknown) => void) => Promise<unknown>
}

function createMockBuilder(): MockBuilder {
  const builder = {} as MockBuilder
  for (const m of chainMethods) {
    builder[m] = vi.fn(() => builder) as Mock<(...args: unknown[]) => MockBuilder>
  }
  return builder
}

const mockFeaturedBuilder = createMockBuilder()
const mockCountBuilder = createMockBuilder()

let mockFeaturedData: MockData[] = []
let mockFeaturedError: unknown = null
let mockCount: number | null = null
let mockCountError: unknown = null

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'listings') return mockCountBuilder
      return mockFeaturedBuilder
    }),
  })),
}))

beforeEach(() => {
  vi.clearAllMocks()
  mockFeaturedData = []
  mockFeaturedError = null
  mockCount = 0
  mockCountError = null

  mockFeaturedBuilder.then = (resolve: (value: unknown) => void) => {
    resolve({ data: mockFeaturedData, error: mockFeaturedError })
    return Promise.resolve({ data: mockFeaturedData, error: mockFeaturedError })
  }

  mockCountBuilder.then = (resolve: (value: unknown) => void) => {
    resolve({ count: mockCount, error: mockCountError })
    return Promise.resolve({ count: mockCount, error: mockCountError })
  }
})

describe('getFeaturedListings', () => {
  it('returns an empty array when no listings exist', async () => {
    const results = await getFeaturedListings()
    expect(results).toEqual([])
  })

  it('returns listings with the search result shape', async () => {
    mockFeaturedData = [{
      id: '1',
      title: 'Studio A',
      price_cents: 5000,
      location: 'Portland',
      images: ['https://example.com/a.jpg'],
      created_at: new Date().toISOString(),
      avg_rating: 4.5,
      review_count: 2,
    }]

    const results = await getFeaturedListings()
    expect(results).toHaveLength(1)
    expect(results[0]).toEqual(
      expect.objectContaining({
        id: '1',
        title: 'Studio A',
        price_cents: 5000,
        location: 'Portland',
        images: ['https://example.com/a.jpg'],
        avg_rating: 4.5,
        review_count: 2,
      }),
    )
  })

  it('coerces avg_rating and review_count to numbers', async () => {
    mockFeaturedData = [{
      id: '1',
      title: 'Studio A',
      price_cents: 5000,
      location: 'Portland',
      images: [],
      created_at: new Date().toISOString(),
      avg_rating: '4.5',
      review_count: '2',
    }]

    const results = await getFeaturedListings()
    expect(results[0].avg_rating).toBe(4.5)
    expect(results[0].review_count).toBe(2)
  })

  it('defaults images to an empty array when missing', async () => {
    mockFeaturedData = [{
      id: '1',
      title: 'Studio A',
      price_cents: 5000,
      location: 'Portland',
      created_at: new Date().toISOString(),
    }]

    const results = await getFeaturedListings()
    expect(results[0].images).toEqual([])
  })

  it('orders by created_at descending and limits to the requested count', async () => {
    mockFeaturedData = [
      { id: '1', title: 'Oldest', price_cents: 1000, location: 'A', images: [], created_at: '2026-01-01T00:00:00Z' },
      { id: '2', title: 'Newest', price_cents: 2000, location: 'B', images: [], created_at: '2026-01-02T00:00:00Z' },
    ]

    await getFeaturedListings(5)

    const orderCalls = vi.mocked(mockFeaturedBuilder.order).mock.calls
    expect(orderCalls).toHaveLength(1)
    expect(orderCalls[0]).toEqual(['created_at', { ascending: false }])

    const limitCalls = vi.mocked(mockFeaturedBuilder.limit).mock.calls
    expect(limitCalls).toHaveLength(1)
    expect(limitCalls[0]).toEqual([5])
  })

  it('filters to published status only', async () => {
    mockFeaturedData = []

    await getFeaturedListings()

    const eqCalls = vi.mocked(mockFeaturedBuilder.eq).mock.calls
    expect(eqCalls).toContainEqual(['status', 'published'])
  })

  it('returns an empty array on query error', async () => {
    mockFeaturedError = { code: 'PGRST116', message: 'not found' }

    const results = await getFeaturedListings()
    expect(results).toEqual([])
  })
})

describe('getCategoryCounts', () => {
  it('returns counts for every defined category', async () => {
    const results = await getCategoryCounts()
    expect(results).toEqual(
      expect.objectContaining({
        'photography-studio': 0,
        'event-venue': 0,
        'meeting-room': 0,
        'activity-space': 0,
      }),
    )
  })

  it('queries the listings table with head-only exact counts', async () => {
    mockCount = 3
    const results = await getCategoryCounts()

    const selectCalls = vi.mocked(mockCountBuilder.select).mock.calls
    expect(selectCalls[0][0]).toEqual('*')
    expect(selectCalls[0][1]).toEqual({ count: 'exact', head: true })

    expect(results['photography-studio']).toBe(3)
  })

  it('filters each count by published status and category', async () => {
    await getCategoryCounts()

    const eqCalls = vi.mocked(mockCountBuilder.eq).mock.calls
    // Each category gets exactly two eq calls: status, then category
    const statusCalls = eqCalls.filter(([field]) => field === 'status')
    expect(statusCalls).toHaveLength(4)
    expect(statusCalls.every(([, value]) => value === 'published')).toBe(true)
  })

  it('returns 0 for a category when its count query errors', async () => {
    mockCountError = { code: 'PGRST301', message: 'permission denied' }

    const results = await getCategoryCounts()
    expect(results['photography-studio']).toBe(0)
  })
})
