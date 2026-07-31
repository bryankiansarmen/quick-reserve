import { describe, it, expect, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hj04zWl196z2-SBc0'

function uniqueEmail(tag: string): string {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@example.com`
}

function createAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function signUpUser(tag: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storageKey: `test-reviews-${tag}-${Date.now()}`,
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  const email = uniqueEmail(`reviews-${tag}`)
  const password = 'Password123!'
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: `Review Test ${tag}` } },
  })
  if (error || !data.user) throw new Error(`signUp failed: ${error?.message}`)
  return { client, user: data.user, email }
}

async function createListing(
  client: SupabaseClient,
  sellerId: string,
  overrides: Record<string, unknown> = {},
) {
  const { data, error } = await client
    .from('listings')
    .insert({
      seller_id: sellerId,
      title: 'Test Listing',
      category: 'photography-studio',
      price_cents: 5000,
      location: 'Test City',
      booking_mode: 'instant',
      status: 'published',
      ...overrides,
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
  durationMinutes = 120,
) {
  const start = new Date(Date.now() + startMinutesFromNow * 60 * 1000).toISOString()
  const end = new Date(Date.now() + (startMinutesFromNow + durationMinutes) * 60 * 1000).toISOString()
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
) {
  const { data, error } = await buyerClient
    .from('bookings')
    .insert({
      listing_id: listingId,
      buyer_id: buyerId,
      slot_id: slotId,
      amount_cents: 5000,
    })
    .select()
    .single()
  if (error) throw new Error(`createBooking failed: ${error.message}`)
  return data
}

async function setBookingStatus(
  sellerClient: SupabaseClient,
  bookingId: string,
  status: string,
) {
  const { error } = await sellerClient
    .from('bookings')
    .update({ status })
    .eq('id', bookingId)
  if (error) throw new Error(`setBookingStatus failed: ${error.message}`)
}

interface ReviewFixture {
  sellerClient: SupabaseClient
  buyerClient: SupabaseClient
  listingId: string
  bookingId: string
}

/** Build a published listing + completed booking owned by the buyer. */
async function completedBookingFixture(tag: string): Promise<ReviewFixture> {
  const { client: sellerClient, user: seller } = await signUpUser(`seller-${tag}`)
  const { client: buyerClient, user: buyer } = await signUpUser(`buyer-${tag}`)
  createdUserIds.push(seller.id, buyer.id)

  const listing = await createListing(sellerClient, seller.id)
  const slot = await createSlot(sellerClient, listing.id)
  const booking = await createBooking(buyerClient, listing.id, slot.id, buyer.id)
  await setBookingStatus(sellerClient, booking.id, 'completed')

  return { sellerClient, buyerClient, listingId: listing.id, bookingId: booking.id }
}

function reviewPayload(bookingId: string, reviewerId: string, overrides: Record<string, unknown> = {}) {
  return {
    booking_id: bookingId,
    reviewer_id: reviewerId,
    rating: 5,
    comment: 'Great space!',
    ...overrides,
  }
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

describe('reviews table — RLS policies for SELECT', () => {
  it('anonymous can read reviews (public social proof)', async () => {
    const { buyerClient, bookingId } = await completedBookingFixture('anon-read')
    const buyer = (await buyerClient.auth.getUser()).data.user!
    await buyerClient
      .from('reviews')
      .insert(reviewPayload(bookingId, buyer.id))

    const anonClient = createAnonClient()
    const { data, error } = await anonClient.from('reviews').select('*')

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data!.length).toBeGreaterThanOrEqual(1)
    expect(data!.find(r => r.booking_id === bookingId)).toBeDefined()
  })

  it('any authenticated user can read reviews', async () => {
    const { buyerClient, bookingId } = await completedBookingFixture('auth-read')
    const buyer = (await buyerClient.auth.getUser()).data.user!
    await buyerClient
      .from('reviews')
      .insert(reviewPayload(bookingId, buyer.id))

    const { client: otherClient, user: other } = await signUpUser('other-read')
    createdUserIds.push(other.id)

    const { data, error } = await otherClient
      .from('reviews')
      .select('*')
      .eq('booking_id', bookingId)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].booking_id).toBe(bookingId)
  })
})

describe('reviews table — RLS policies for INSERT', () => {
  it('buyer can review their own completed booking', async () => {
    const { buyerClient, bookingId } = await completedBookingFixture('own-completed')
    const buyer = (await buyerClient.auth.getUser()).data.user!

    const { data, error } = await buyerClient
      .from('reviews')
      .insert(reviewPayload(bookingId, buyer.id))
      .select()
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data!.reviewer_id).toBe(buyer.id)
    expect(data!.rating).toBe(5)
  })

  it('buyer cannot review a pending booking (DoD)', async () => {
    const { client: sellerClient, user: seller } = await signUpUser('seller-pending')
    const { client: buyerClient, user: buyer } = await signUpUser('buyer-pending')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id)
    const booking = await createBooking(buyerClient, listing.id, slot.id, buyer.id)

    const { error } = await buyerClient
      .from('reviews')
      .insert(reviewPayload(booking.id, buyer.id))
      .select()
      .single()

    expect(error).not.toBeNull()
  })

  it('buyer cannot review a confirmed (non-completed) booking', async () => {
    const { client: sellerClient, user: seller } = await signUpUser('seller-confirmed')
    const { client: buyerClient, user: buyer } = await signUpUser('buyer-confirmed')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id)
    const booking = await createBooking(buyerClient, listing.id, slot.id, buyer.id)
    await setBookingStatus(sellerClient, booking.id, 'confirmed')

    const { error } = await buyerClient
      .from('reviews')
      .insert(reviewPayload(booking.id, buyer.id))
      .select()
      .single()

    expect(error).not.toBeNull()
  })

  it('buyer cannot review another buyer\'s completed booking', async () => {
    const { bookingId } = await completedBookingFixture('cross-buyer')
    const { client: otherBuyerClient, user: otherBuyer } = await signUpUser('other-buyer')
    createdUserIds.push(otherBuyer.id)

    const { error } = await otherBuyerClient
      .from('reviews')
      .insert(reviewPayload(bookingId, otherBuyer.id))
      .select()
      .single()

    expect(error).not.toBeNull()
  })

  it('buyer cannot insert a review as another user', async () => {
    const { buyerClient, bookingId } = await completedBookingFixture('spoof-reviewer')
    const { user: otherBuyer } = await signUpUser('spoof-target')
    createdUserIds.push(otherBuyer.id)

    const { error } = await buyerClient
      .from('reviews')
      .insert(reviewPayload(bookingId, otherBuyer.id))
      .select()
      .single()

    expect(error).not.toBeNull()
    expect(error!.message).not.toBeNull()
  })

  it('duplicate review on the same booking fails (unique constraint)', async () => {
    const { buyerClient, bookingId } = await completedBookingFixture('duplicate')
    const buyer = (await buyerClient.auth.getUser()).data.user!

    const { error: firstErr } = await buyerClient
      .from('reviews')
      .insert(reviewPayload(bookingId, buyer.id))
    expect(firstErr).toBeNull()

    const { error: secondErr } = await buyerClient
      .from('reviews')
      .insert(reviewPayload(bookingId, buyer.id))

    expect(secondErr).not.toBeNull()
    expect(secondErr!.code).toBe('23505')
    expect(secondErr!.message).toContain('reviews_booking_id_key')
  })
})

describe('published_listings_with_rating view', () => {
  it('exposes avg_rating and review_count for a published listing', async () => {
    const { sellerClient, buyerClient, listingId, bookingId } =
      await completedBookingFixture('view-single')
    const buyer = (await buyerClient.auth.getUser()).data.user!
    await buyerClient
      .from('reviews')
      .insert(reviewPayload(bookingId, buyer.id, { rating: 4 }))

    const { data, error } = await sellerClient
      .from('published_listings_with_rating')
      .select('id, avg_rating, review_count')
      .eq('id', listingId)
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(Number(data!.avg_rating)).toBeCloseTo(4)
    expect(Number(data!.review_count)).toBe(1)
  })

  it('aggregates across multiple completed bookings', async () => {
    const { client: sellerClient, user: seller } = await signUpUser('seller-view-multi')
    const { client: buyerClient, user: buyer } = await signUpUser('buyer-view-multi')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot1 = await createSlot(sellerClient, listing.id, 120, 60)
    const slot2 = await createSlot(sellerClient, listing.id, 240, 60)
    const booking1 = await createBooking(buyerClient, listing.id, slot1.id, buyer.id)
    const booking2 = await createBooking(buyerClient, listing.id, slot2.id, buyer.id)
    await setBookingStatus(sellerClient, booking1.id, 'completed')
    await setBookingStatus(sellerClient, booking2.id, 'completed')

    await buyerClient.from('reviews').insert(reviewPayload(booking1.id, buyer.id, { rating: 4 }))
    await buyerClient.from('reviews').insert(reviewPayload(booking2.id, buyer.id, { rating: 5 }))

    const { data, error } = await sellerClient
      .from('published_listings_with_rating')
      .select('id, avg_rating, review_count')
      .eq('id', listing.id)
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(Number(data!.avg_rating)).toBeCloseTo(4.5)
    expect(Number(data!.review_count)).toBe(2)
  })

  it('anonymous sees the same aggregates as authenticated users', async () => {
    const { buyerClient, listingId, bookingId } = await completedBookingFixture('view-anon')
    const buyer = (await buyerClient.auth.getUser()).data.user!
    await buyerClient
      .from('reviews')
      .insert(reviewPayload(bookingId, buyer.id, { rating: 3 }))

    const anonClient = createAnonClient()
    const { data, error } = await anonClient
      .from('published_listings_with_rating')
      .select('id, avg_rating, review_count')
      .eq('id', listingId)
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(Number(data!.avg_rating)).toBeCloseTo(3)
    expect(Number(data!.review_count)).toBe(1)
  })
})
