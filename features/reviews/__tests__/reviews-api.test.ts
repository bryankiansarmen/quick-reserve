import { describe, it, expect, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * POST /api/reviews HTTP integration tests.
 *
 * Gated behind TEST_INTEGRATION=true + a running dev server on
 * localhost:3000 (same convention as features/bookings/__tests__/bookings-api.test.ts).
 * Skips in the default `npm test` run.
 */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hj04zWl196z2-SBc0'

const isIntegrationTest = process.env.TEST_INTEGRATION === 'true'

function uniqueEmail(tag: string): string {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@example.com`
}

async function signUpUser(tag: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storageKey: `test-reviews-api-${tag}-${Date.now()}`,
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  const email = uniqueEmail(`reviews-api-${tag}`)
  const password = 'Password123!'
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: `Review API ${tag}` } },
  })
  if (error || !data.session || !data.user) {
    throw new Error(`signUp failed: ${error?.message}`)
  }
  return { client, user: data.user, session: data.session }
}

async function createListing(
  client: SupabaseClient,
  sellerId: string,
): Promise<{ id: string }> {
  const { data, error } = await client
    .from('listings')
    .insert({
      seller_id: sellerId,
      title: 'Review API Listing',
      category: 'photography-studio',
      price_cents: 5000,
      location: 'Test City',
      booking_mode: 'instant',
      status: 'published',
    })
    .select('id')
    .single()
  if (error) throw new Error(`createListing failed: ${error.message}`)
  return data
}

async function createSlot(
  client: SupabaseClient,
  listingId: string,
  startMinutesFromNow = 60,
): Promise<{ id: string }> {
  const start = new Date(Date.now() + startMinutesFromNow * 60 * 1000).toISOString()
  const end = new Date(Date.now() + (startMinutesFromNow + 120) * 60 * 1000).toISOString()
  const { data, error } = await client
    .from('availability_slots')
    .insert({ listing_id: listingId, start_time: start, end_time: end })
    .select('id')
    .single()
  if (error) throw new Error(`createSlot failed: ${error.message}`)
  return data
}

async function createBooking(
  buyerClient: SupabaseClient,
  listingId: string,
  slotId: string,
  buyerId: string,
  status: 'pending' | 'confirmed' | 'completed' = 'completed',
) {
  const { data, error } = await buyerClient
    .from('bookings')
    .insert({
      listing_id: listingId,
      buyer_id: buyerId,
      slot_id: slotId,
      amount_cents: 5000,
      status,
    })
    .select('id')
    .single()
  if (error) throw new Error(`createBooking failed: ${error.message}`)
  return data as { id: string }
}

const createdUserIds: string[] = []

afterAll(async () => {
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  for (const id of createdUserIds) {
    try {
      await adminClient.auth.admin.deleteUser(id)
    } catch {
      // Ignore cleanup errors
    }
  }
})

function makeRequest(
  session: { access_token: string; refresh_token: string },
  body: Record<string, unknown>,
) {
  const cookieName = 'sb-127-auth-token'
  const cookieValue = JSON.stringify({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
  })

  return fetch('http://localhost:3000/api/reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `${cookieName}=${encodeURIComponent(cookieValue)}`,
    },
    body: JSON.stringify(body),
  })
}

async function unauthenticatedRequest(body: Record<string, unknown>) {
  return fetch('http://localhost:3000/api/reviews', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe.skipIf(!isIntegrationTest)('POST /api/reviews - HTTP endpoint', () => {
  it('returns 201 for a completed booking owned by the buyer', async () => {
    const { client: sellerClient, user: seller } = await signUpUser('seller-success')
    const { client: buyerClient, user: buyer, session } = await signUpUser('buyer-success')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id, 60)
    const booking = await createBooking(buyerClient, listing.id, slot.id, buyer.id, 'completed')

    const response = await makeRequest(session, {
      booking_id: booking.id,
      rating: 5,
      comment: 'Great space!',
    })
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toHaveProperty('data')
    expect(data.data.reviewer_id).toBe(buyer.id)
    expect(data.data.rating).toBe(5)
  })

  it('returns 401 for an unauthenticated request', async () => {
    const response = await unauthenticatedRequest({
      booking_id: '00000000-0000-0000-0000-000000000001',
      rating: 5,
    })

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error.code).toBe('UNAUTHENTICATED')
  })

  it('returns 400 for an invalid rating', async () => {
    const { user, session } = await signUpUser('bad-rating')
    createdUserIds.push(user.id)

    const response = await makeRequest(session, {
      booking_id: '00000000-0000-0000-0000-000000000001',
      rating: 6,
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('VALIDATION_ERROR')
    expect(data.error.details).toHaveProperty('rating')
  })

  it('returns 404 for a booking the buyer does not own', async () => {
    const { client: sellerClient, user: seller } = await signUpUser('seller-404')
    const { client: buyer1Client, user: buyer1 } = await signUpUser('buyer-404-1')
    const { session: buyer2Session, user: buyer2 } = await signUpUser('buyer-404-2')
    createdUserIds.push(seller.id, buyer1.id, buyer2.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id, 120)
    const booking = await createBooking(buyer1Client, listing.id, slot.id, buyer1.id, 'completed')
    // A second buyer cannot see buyer1's booking (RLS) → 404, no leak.

    const response = await makeRequest(buyer2Session, {
      booking_id: booking.id,
      rating: 4,
    })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error.code).toBe('NOT_FOUND')
  })

  it('returns 403 BOOKING_NOT_COMPLETED for a pending booking', async () => {
    const { client: sellerClient, user: seller } = await signUpUser('seller-pending')
    const { client: buyerClient, user: buyer, session } = await signUpUser('buyer-pending')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id, 180)
    const booking = await createBooking(buyerClient, listing.id, slot.id, buyer.id, 'pending')

    const response = await makeRequest(session, {
      booking_id: booking.id,
      rating: 5,
    })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error.code).toBe('BOOKING_NOT_COMPLETED')
  })

  it('returns 409 REVIEW_ALREADY_EXISTS on a duplicate review', async () => {
    const { client: sellerClient, user: seller } = await signUpUser('seller-dup')
    const { client: buyerClient, user: buyer, session } = await signUpUser('buyer-dup')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id, 240)
    const booking = await createBooking(buyerClient, listing.id, slot.id, buyer.id, 'completed')

    const first = await makeRequest(session, { booking_id: booking.id, rating: 3 })
    expect(first.status).toBe(201)

    const second = await makeRequest(session, { booking_id: booking.id, rating: 4 })
    const data = await second.json()

    expect(second.status).toBe(409)
    expect(data.error.code).toBe('REVIEW_ALREADY_EXISTS')
  })
})
