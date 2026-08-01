import { describe, it, expect, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * `cancel_booking` state-transition tests.
 *
 * Exercises the exact RPC call the PATCH /api/bookings/[id] handler makes.
 * Requires a running Supabase stack with the cancel_booking migration applied;
 * gated behind TEST_INTEGRATION=true like the reviews API integration suite.
 */

const TEST_INTEGRATION = process.env.TEST_INTEGRATION === 'true'

const describeIntegration = TEST_INTEGRATION ? describe : describe.skip

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

async function signUpUser(tag: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storageKey: `test-canc-${tag}-${Date.now()}`,
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  const email = uniqueEmail(`canc-${tag}`)
  const password = 'Password123!'
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: `User ${tag}` } },
  })
  if (error || !data.user) throw new Error(`signUp failed: ${error?.message}`)
  return { client, user: data.user }
}

async function createListing(client: SupabaseClient, sellerId: string) {
  const { data, error } = await client
    .from('listings')
    .insert({
      seller_id: sellerId,
      title: 'Cancellation Studio',
      category: 'photography-studio',
      price_cents: 5000,
      location: 'Test City',
      booking_mode: 'request',
      status: 'published',
    })
    .select('id')
    .single()
  if (error) throw new Error(`createListing failed: ${error.message}`)
  return data as { id: string }
}

async function createSlot(
  client: SupabaseClient,
  listingId: string,
  startInMs: number = 60 * 60 * 1000,
) {
  const start = new Date(Date.now() + startInMs).toISOString()
  const end = new Date(new Date(start).getTime() + 2 * 60 * 60 * 1000).toISOString()
  const { data, error } = await client
    .from('availability_slots')
    .insert({ listing_id: listingId, start_time: start, end_time: end })
    .select('id, start_time')
    .single()
  if (error) throw new Error(`createSlot failed: ${error.message}`)
  return data as { id: string; start_time: string }
}

async function createBooking(
  client: SupabaseClient,
  booking: {
    listing_id: string
    buyer_id: string
    slot_id: string
    status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  },
) {
  const { data, error } = await client
    .from('bookings')
    .insert({
      listing_id: booking.listing_id,
      buyer_id: booking.buyer_id,
      slot_id: booking.slot_id,
      status: booking.status ?? 'pending',
      stripe_payment_intent_id: `pi_test_canc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      amount_cents: 5000,
    })
    .select('id, status')
    .single()
  if (error) throw new Error(`createBooking failed: ${error.message}`)
  return data as { id: string; status: string }
}

async function getBookingStatus(adminClient: SupabaseClient, bookingId: string) {
  const { data, error } = await adminClient
    .from('bookings')
    .select('id, status')
    .eq('id', bookingId)
    .single()
  if (error || !data) throw new Error(`fetch booking failed: ${error?.message}`)
  return data.status as string
}

async function getSlotBooked(adminClient: SupabaseClient, slotId: string) {
  const { data, error } = await adminClient
    .from('availability_slots')
    .select('id, is_booked')
    .eq('id', slotId)
    .single()
  if (error || !data) throw new Error(`fetch slot failed: ${error?.message}`)
  return data.is_booked as boolean
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

describeIntegration('cancel_booking state transitions', () => {
  it('a buyer cancelling their booking releases the slot and allows re-booking', async () => {
    const { client: buyerClient, user: buyer } = await signUpUser('buyer')
    const { client: sellerClient, user: seller } = await signUpUser('seller')
    createdUserIds.push(buyer.id, seller.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id)
    const booking = await createBooking(buyerClient, {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: slot.id,
    })

    const { error } = await buyerClient.rpc('cancel_booking', {
      p_booking_id: booking.id,
    })

    expect(error).toBeNull()
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    expect(await getBookingStatus(adminClient, booking.id)).toBe('cancelled')
    expect(await getSlotBooked(adminClient, slot.id)).toBe(false)

    // The partial unique index excludes cancelled bookings, so the released
    // slot can be booked again.
    const rebooking = await createBooking(buyerClient, {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: slot.id,
    })
    expect(rebooking.status).toBe('pending')
  })

  it('a seller can cancel a booking on their own listing', async () => {
    const { client: buyerClient, user: buyer } = await signUpUser('b2')
    const { client: sellerClient, user: seller } = await signUpUser('s2')
    createdUserIds.push(buyer.id, seller.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id)
    const booking = await createBooking(buyerClient, {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: slot.id,
      status: 'confirmed',
    })

    const { error } = await sellerClient.rpc('cancel_booking', {
      p_booking_id: booking.id,
    })

    expect(error).toBeNull()
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    expect(await getBookingStatus(adminClient, booking.id)).toBe('cancelled')
    expect(await getSlotBooked(adminClient, slot.id)).toBe(false)
  })

  it('rejects cancelling an already-cancelled booking (BKC04)', async () => {
    const { client: buyerClient, user: buyer } = await signUpUser('b3')
    const { client: sellerClient, user: seller } = await signUpUser('s3')
    createdUserIds.push(buyer.id, seller.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id)
    const booking = await createBooking(buyerClient, {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: slot.id,
    })

    await buyerClient.rpc('cancel_booking', { p_booking_id: booking.id })

    const { error } = await buyerClient.rpc('cancel_booking', {
      p_booking_id: booking.id,
    })
    expect(error?.code).toBe('BKC04')
  })

  it('rejects cancelling a completed booking (BKC04)', async () => {
    const { client: buyerClient, user: buyer } = await signUpUser('b4')
    const { client: sellerClient, user: seller } = await signUpUser('s4')
    createdUserIds.push(buyer.id, seller.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id)
    const booking = await createBooking(buyerClient, {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: slot.id,
      status: 'completed',
    })

    const { error } = await buyerClient.rpc('cancel_booking', {
      p_booking_id: booking.id,
    })
    expect(error?.code).toBe('BKC04')
  })

  it('rejects cancelling after the slot has started (BKC05)', async () => {
    const { client: buyerClient, user: buyer } = await signUpUser('b5')
    const { client: sellerClient, user: seller } = await signUpUser('s5')
    createdUserIds.push(buyer.id, seller.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id, -60 * 60 * 1000)
    const booking = await createBooking(buyerClient, {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: slot.id,
    })

    const { error } = await buyerClient.rpc('cancel_booking', {
      p_booking_id: booking.id,
    })
    expect(error?.code).toBe('BKC05')
  })

  it('rejects a caller who is neither buyer nor seller (BKC03)', async () => {
    const { client: buyerClient, user: buyer } = await signUpUser('b6')
    const { client: sellerClient, user: seller } = await signUpUser('s6')
    const { client: strangerClient, user: stranger } = await signUpUser('x6')
    createdUserIds.push(buyer.id, seller.id, stranger.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id)
    const booking = await createBooking(buyerClient, {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: slot.id,
    })

    const { error } = await strangerClient.rpc('cancel_booking', {
      p_booking_id: booking.id,
    })
    expect(error?.code).toBe('BKC03')
  })

  it('rejects a missing booking (BKC02)', async () => {
    const { client: buyerClient, user: buyer } = await signUpUser('b7')
    const { user: seller } = await signUpUser('s7')
    createdUserIds.push(buyer.id, seller.id)

    const { error } = await buyerClient.rpc('cancel_booking', {
      p_booking_id: '00000000-0000-4000-8000-000000000000',
    })
    expect(error?.code).toBe('BKC02')
  })
})
