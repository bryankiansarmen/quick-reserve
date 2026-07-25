import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateListingStatusAction } from '../actions'

// Mock next/cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

// Define mocked functions using vi.hoisted so they can be referenced inside the hoisted vi.mock
const { mockGetUser, mockSingle, mockSupabase, mockUpdateResponse } = vi.hoisted(() => {
  const mockGetUser = vi.fn()
  const _mockSelect = vi.fn()
  const _mockUpdate = vi.fn()
  const _mockEq = vi.fn()
  const mockSingle = vi.fn()
  
  // This allows us to customize the database resolution for updates/inserts
  const mockUpdateResponse = {
    value: { data: null, error: null }
  }

  const mockSupabase = {
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn().mockImplementation(() => {
      const queryBuilder = {
        select: _mockSelect.mockReturnThis(),
        update: _mockUpdate.mockReturnThis(),
        eq: _mockEq.mockReturnThis(),
        single: mockSingle,
        // Make the query builder a thenable so we can await it directly (e.g. for update calls)
        then: vi.fn().mockImplementation((onFulfilled) => {
          return Promise.resolve(mockUpdateResponse.value).then(onFulfilled)
        }),
      }
      return queryBuilder
    }),
  }

  return { mockGetUser, mockSingle, mockSupabase, mockUpdateResponse }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}))

describe('updateListingStatusAction unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateResponse.value = { data: null, error: null }
  })

  it('fails if user is not signed in', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('No user') })

    const result = await updateListingStatusAction('listing-123', 'published')

    expect(result.generalError).toBe('You must be signed in to update listing status.')
  })

  it('fails if listing is not found', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'seller-abc' } } })
    mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } })

    const result = await updateListingStatusAction('listing-123', 'published')

    expect(result.generalError).toBe('Listing not found.')
  })

  it('fails if listing is not owned by the authenticated seller', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'seller-abc' } } })
    mockSingle.mockResolvedValueOnce({
      data: { seller_id: 'seller-different', images: ['url1'], status: 'draft' },
      error: null,
    })

    const result = await updateListingStatusAction('listing-123', 'published')

    expect(result.generalError).toBe("You don't have permission to update this listing.")
  })

  it('fails to publish if listing has no images', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'seller-abc' } } })
    mockSingle.mockResolvedValueOnce({
      data: { seller_id: 'seller-abc', images: [], status: 'draft' },
      error: null,
    })

    const result = await updateListingStatusAction('listing-123', 'published')

    expect(result.errors?.status).toContain('Add at least 1 image before publishing')
    expect(result.success).toBeUndefined()
  })

  it('successfully publishes if listing has images', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'seller-abc' } } })
    mockSingle.mockResolvedValueOnce({
      data: { seller_id: 'seller-abc', images: ['image-url.jpg'], status: 'draft' },
      error: null,
    })

    const result = await updateListingStatusAction('listing-123', 'published')

    expect(result.success).toBe(true)
    expect(result.errors).toBeUndefined()
  })

  it('allows archiving a listing without image validation', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'seller-abc' } } })
    mockSingle.mockResolvedValueOnce({
      data: { seller_id: 'seller-abc', images: [], status: 'published' },
      error: null,
    })

    const result = await updateListingStatusAction('listing-123', 'archived')

    expect(result.success).toBe(true)
    expect(result.errors).toBeUndefined()
  })

  it('handles database update errors gracefully', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'seller-abc' } } })
    mockSingle.mockResolvedValueOnce({
      data: { seller_id: 'seller-abc', images: [], status: 'draft' },
      error: 'null',
    })
    mockUpdateResponse.value = { data: null, error: { message: 'Database constraint failed' } as unknown as { message: string } }

    const result = await updateListingStatusAction('listing-123', 'archived')

    expect(result.success).toBeUndefined()
    expect(result.generalError).toBe('Database constraint failed')
  })
})
