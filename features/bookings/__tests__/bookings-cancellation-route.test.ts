import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/bookings/[id]/route'

const BOOKING_ID = '550e8400-e29b-41d4-a716-446655440000'

const m = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockRpc: vi.fn(),
  mockGetStripe: vi.fn(),
  mockCancelPaymentIntent: vi.fn(),
  mockNotifyBookingCancelled: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: m.mockGetUser },
    rpc: m.mockRpc,
    from: vi.fn(),
  }),
}))

vi.mock('@/lib/stripe/server', () => ({
  getStripe: m.mockGetStripe,
}))

vi.mock('@/features/bookings/notifications', () => ({
  notifyBookingCancelled: m.mockNotifyBookingCancelled,
}))

function makeRequest(id: string, body: unknown) {
  return new NextRequest(`http://localhost:3000/api/bookings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function callPATCH(body: unknown) {
  return PATCH(makeRequest(BOOKING_ID, body), {
    params: Promise.resolve({ id: BOOKING_ID }),
  })
}

function mockAuthUser(user: { id: string } | null, error: unknown = null) {
  m.mockGetUser.mockResolvedValue({ data: { user }, error })
}

function setRpcResult(
  data: Record<string, unknown> | null,
  error: { code?: string; message?: string } | null = null,
) {
  m.mockRpc.mockResolvedValue({ data, error })
}

const PENDING_RESULT = {
  previous_status: 'pending',
  stripe_payment_intent_id: 'pi_test_123',
  cancelled_by: 'buyer',
}

beforeEach(() => {
  m.mockGetUser.mockReset()
  m.mockRpc.mockReset()
  m.mockGetStripe.mockReset()
  m.mockCancelPaymentIntent.mockReset()
  m.mockNotifyBookingCancelled.mockReset()
  m.mockCancelPaymentIntent.mockResolvedValue({ id: 'pi_test_123', status: 'canceled' })
  m.mockNotifyBookingCancelled.mockResolvedValue(undefined)
  m.mockGetStripe.mockReturnValue({
    paymentIntents: { cancel: m.mockCancelPaymentIntent },
  })
})

describe('PATCH /api/bookings/[id] — cancel action (Task 4.4.1)', () => {
  it('cancels a pending booking, cancels its Stripe Payment Intent, and notifies', async () => {
    mockAuthUser({ id: 'buyer-1' })
    setRpcResult(PENDING_RESULT)

    const response = await callPATCH({ action: 'cancel' })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ data: { id: BOOKING_ID, status: 'cancelled' } })
    expect(m.mockRpc).toHaveBeenCalledWith('cancel_booking', {
      p_booking_id: BOOKING_ID,
    })
    expect(m.mockCancelPaymentIntent).toHaveBeenCalledWith('pi_test_123')
    expect(m.mockNotifyBookingCancelled).toHaveBeenCalledWith(BOOKING_ID, 'buyer')
  })

  it('does not cancel the Stripe Payment Intent for a confirmed booking (refund deferred)', async () => {
    mockAuthUser({ id: 'seller-2' })
    setRpcResult({
      previous_status: 'confirmed',
      stripe_payment_intent_id: 'pi_test_123',
      cancelled_by: 'seller',
    })

    const response = await callPATCH({ action: 'cancel' })

    expect(response.status).toBe(200)
    expect(m.mockCancelPaymentIntent).not.toHaveBeenCalled()
    expect(m.mockNotifyBookingCancelled).toHaveBeenCalledWith(BOOKING_ID, 'seller')
  })

  it('skips the Payment Intent when a pending booking has no intent id', async () => {
    mockAuthUser({ id: 'buyer-1' })
    setRpcResult({
      previous_status: 'pending',
      stripe_payment_intent_id: null,
      cancelled_by: 'buyer',
    })

    const response = await callPATCH({ action: 'cancel' })

    expect(response.status).toBe(200)
    expect(m.mockCancelPaymentIntent).not.toHaveBeenCalled()
    expect(m.mockNotifyBookingCancelled).toHaveBeenCalledWith(BOOKING_ID, 'buyer')
  })

  it('still returns 200 when Stripe is not configured', async () => {
    mockAuthUser({ id: 'buyer-1' })
    setRpcResult(PENDING_RESULT)
    m.mockGetStripe.mockReturnValue(null)

    const response = await callPATCH({ action: 'cancel' })

    expect(response.status).toBe(200)
    expect(m.mockCancelPaymentIntent).not.toHaveBeenCalled()
  })

  it('returns 200 even when the Stripe Payment Intent cancellation fails (non-fatal)', async () => {
    mockAuthUser({ id: 'buyer-1' })
    setRpcResult(PENDING_RESULT)
    m.mockCancelPaymentIntent.mockRejectedValueOnce(new Error('intent already canceled'))

    const response = await callPATCH({ action: 'cancel' })

    expect(response.status).toBe(200)
  })

  it('returns 404 NOT_FOUND when the booking does not exist (BKC02)', async () => {
    mockAuthUser({ id: 'buyer-1' })
    setRpcResult(null, { code: 'BKC02', message: 'booking_not_found' })

    const response = await callPATCH({ action: 'cancel' })
    const body = await response.json()

    expect(response.status).toBe(404)
    expect(body.error.code).toBe('NOT_FOUND')
    expect(m.mockNotifyBookingCancelled).not.toHaveBeenCalled()
  })

  it('returns 403 FORBIDDEN for a caller who is neither buyer nor seller (BKC03)', async () => {
    mockAuthUser({ id: 'stranger-3' })
    setRpcResult(null, { code: 'BKC03', message: 'not_authorized' })

    const response = await callPATCH({ action: 'cancel' })
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body.error.code).toBe('FORBIDDEN')
  })

  it('returns 400 INVALID_ACTION for an already-cancelled booking (BKC04)', async () => {
    mockAuthUser({ id: 'buyer-1' })
    setRpcResult(null, { code: 'BKC04', message: 'invalid_booking_status' })

    const response = await callPATCH({ action: 'cancel' })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('INVALID_ACTION')
  })

  it('returns 400 INVALID_ACTION after the slot has started (BKC05)', async () => {
    mockAuthUser({ id: 'buyer-1' })
    setRpcResult(null, { code: 'BKC05', message: 'cancellation_window_closed' })

    const response = await callPATCH({ action: 'cancel' })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('INVALID_ACTION')
  })

  it('returns 500 for an unexpected database error', async () => {
    mockAuthUser({ id: 'buyer-1' })
    setRpcResult(null, { code: 'XX000', message: 'internal_error' })

    const response = await callPATCH({ action: 'cancel' })
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error.code).toBe('INTERNAL_ERROR')
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuthUser(null, { message: 'no session' })

    const response = await callPATCH({ action: 'cancel' })
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error.code).toBe('UNAUTHENTICATED')
  })

  it('returns 400 for an invalid action', async () => {
    mockAuthUser({ id: 'buyer-1' })

    const response = await callPATCH({ action: 'explode' })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it('returns 400 for malformed JSON', async () => {
    mockAuthUser({ id: 'buyer-1' })

    const request = new NextRequest(`http://localhost:3000/api/bookings/${BOOKING_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: '{not-json',
    })
    const response = await PATCH(request, {
      params: Promise.resolve({ id: BOOKING_ID }),
    })
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })
})
