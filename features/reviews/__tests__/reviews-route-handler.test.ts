import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/reviews/route'

const BOOKING_ID = '550e8400-e29b-41d4-a716-446655440000'

const m = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockFrom: vi.fn(),
  mockReviewInsert: vi.fn(),
  bookingResult: { data: null, error: null } as {
    data: Record<string, unknown> | null
    error: { code?: string; message?: string } | null
  },
  reviewResult: { data: null, error: null } as {
    data: Record<string, unknown> | null
    error: { code?: string; message?: string } | null
  },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: m.mockGetUser },
    from: m.mockFrom,
  }),
}))

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function mockAuthUser(user: { id: string } | null, error: unknown = null) {
  m.mockGetUser.mockResolvedValue({ data: { user }, error })
}

function setBooking(
  data: Record<string, unknown> | null,
  error: { code?: string; message?: string } | null = null,
) {
  m.bookingResult = { data, error }
}

function setReviewInsert(
  data: Record<string, unknown> | null,
  error: { code?: string; message?: string } | null = null,
) {
  m.reviewResult = { data, error }
}

beforeEach(() => {
  m.mockGetUser.mockReset()
  m.mockFrom.mockReset()
  m.mockReviewInsert.mockReset()
  m.bookingResult = { data: null, error: null }
  m.reviewResult = { data: null, error: null }

  m.mockFrom.mockImplementation((table: string) => {
    if (table === 'bookings') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(m.bookingResult),
          }),
        }),
      }
    }
    if (table === 'reviews') {
      return {
        insert: m.mockReviewInsert.mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue(m.reviewResult),
          }),
        }),
      }
    }
    throw new Error(`Unexpected table: ${table}`)
  })
})

describe('POST /api/reviews — route handler', () => {
  it('returns 201 and creates a review for a completed booking', async () => {
    mockAuthUser({ id: 'buyer-1' })
    setBooking({ id: BOOKING_ID, status: 'completed', buyer_id: 'buyer-1' })
    setReviewInsert({
      id: 'review-1',
      booking_id: BOOKING_ID,
      reviewer_id: 'buyer-1',
      rating: 5,
      comment: 'Great space!',
      created_at: '2026-08-01T00:00:00Z',
    })

    const response = await POST(
      makeRequest({ booking_id: BOOKING_ID, rating: 5, comment: 'Great space!' }),
    )
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.data.reviewer_id).toBe('buyer-1')
    expect(m.mockReviewInsert).toHaveBeenCalledWith({
      booking_id: BOOKING_ID,
      reviewer_id: 'buyer-1',
      rating: 5,
      comment: 'Great space!',
    })
  })

  it('normalizes a blank comment to null in the insert', async () => {
    mockAuthUser({ id: 'buyer-1' })
    setBooking({ id: BOOKING_ID, status: 'completed', buyer_id: 'buyer-1' })
    setReviewInsert({ id: 'review-1', booking_id: BOOKING_ID, reviewer_id: 'buyer-1', rating: 3 })

    const response = await POST(makeRequest({ booking_id: BOOKING_ID, rating: 3, comment: '   ' }))
    expect(response.status).toBe(201)
    expect(m.mockReviewInsert).toHaveBeenCalledWith({
      booking_id: BOOKING_ID,
      reviewer_id: 'buyer-1',
      rating: 3,
      comment: null,
    })
  })

  it('omits comment from the insert when not provided', async () => {
    mockAuthUser({ id: 'buyer-1' })
    setBooking({ id: BOOKING_ID, status: 'completed', buyer_id: 'buyer-1' })
    setReviewInsert({ id: 'review-1', booking_id: BOOKING_ID, reviewer_id: 'buyer-1', rating: 4 })

    const response = await POST(makeRequest({ booking_id: BOOKING_ID, rating: 4 }))
    expect(response.status).toBe(201)
    expect(m.mockReviewInsert).toHaveBeenCalledWith({
      booking_id: BOOKING_ID,
      reviewer_id: 'buyer-1',
      rating: 4,
      comment: null,
    })
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuthUser(null, { message: 'no session' })

    const response = await POST(makeRequest({ booking_id: BOOKING_ID, rating: 5 }))
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error.code).toBe('UNAUTHENTICATED')
  })

  it('returns 400 for an out-of-range rating', async () => {
    mockAuthUser({ id: 'buyer-1' })

    const response = await POST(makeRequest({ booking_id: BOOKING_ID, rating: 6 }))
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details.rating).toBeDefined()
  })

  it('returns 400 for an invalid booking_id', async () => {
    mockAuthUser({ id: 'buyer-1' })

    const response = await POST(makeRequest({ booking_id: 'not-a-uuid', rating: 5 }))
    expect(response.status).toBe(400)
  })

  it('returns 400 for malformed JSON', async () => {
    mockAuthUser({ id: 'buyer-1' })

    const request = new NextRequest('http://localhost:3000/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not-json',
    })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 404 when the booking does not exist', async () => {
    mockAuthUser({ id: 'buyer-1' })
    setBooking(null, { code: 'PGRST116', message: 'No rows' })

    const response = await POST(makeRequest({ booking_id: BOOKING_ID, rating: 5 }))
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('returns 403 BOOKING_NOT_COMPLETED for a pending booking', async () => {
    mockAuthUser({ id: 'buyer-1' })
    setBooking({ id: BOOKING_ID, status: 'pending', buyer_id: 'buyer-1' })

    const response = await POST(makeRequest({ booking_id: BOOKING_ID, rating: 5 }))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error.code).toBe('BOOKING_NOT_COMPLETED')
  })

  it('returns 403 BOOKING_NOT_COMPLETED for a confirmed booking', async () => {
    mockAuthUser({ id: 'buyer-1' })
    setBooking({ id: BOOKING_ID, status: 'confirmed', buyer_id: 'buyer-1' })

    const response = await POST(makeRequest({ booking_id: BOOKING_ID, rating: 5 }))
    expect(response.status).toBe(403)
    expect((await response.json()).error.code).toBe('BOOKING_NOT_COMPLETED')
  })

  it('returns 409 REVIEW_ALREADY_EXISTS when a review exists (23505)', async () => {
    mockAuthUser({ id: 'buyer-1' })
    setBooking({ id: BOOKING_ID, status: 'completed', buyer_id: 'buyer-1' })
    setReviewInsert(null, { code: '23505', message: 'duplicate key value violates unique constraint' })

    const response = await POST(makeRequest({ booking_id: BOOKING_ID, rating: 5 }))
    const body = await response.json()

    expect(response.status).toBe(409)
    expect(body.error.code).toBe('REVIEW_ALREADY_EXISTS')
  })

  it('returns 403 FORBIDDEN when the insert is denied by RLS (42501)', async () => {
    mockAuthUser({ id: 'buyer-1' })
    setBooking({ id: BOOKING_ID, status: 'completed', buyer_id: 'buyer-1' })
    setReviewInsert(null, { code: '42501', message: 'permission denied for table reviews' })

    const response = await POST(makeRequest({ booking_id: BOOKING_ID, rating: 5 }))
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error.code).toBe('FORBIDDEN')
  })

  it('returns 500 for an unexpected database error', async () => {
    mockAuthUser({ id: 'buyer-1' })
    setBooking({ id: BOOKING_ID, status: 'completed', buyer_id: 'buyer-1' })
    setReviewInsert(null, { code: 'XX000', message: 'internal_error' })

    const response = await POST(makeRequest({ booking_id: BOOKING_ID, rating: 5 }))
    expect(response.status).toBe(500)
    expect((await response.json()).error.code).toBe('INTERNAL_ERROR')
  })
})
