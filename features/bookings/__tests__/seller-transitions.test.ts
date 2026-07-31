import { describe, it, expect, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Seller accept/decline state-transition tests.
 *
 * Exercises the exact DB operations the PATCH /api/bookings/[id] handler
 * performs — fetch booking + listing via the session-scoped client (RLS
 * scopes it to the seller's own listings), then update status. Verifies the
 * business rule: accept/decline only for `request`
 * booking_mode listings with `pending` bookings, and the RLS update policy
 * ("sellers update booking status on own listings") that backs it.
 */

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
      storageKey: `test-st-${tag}-${Date.now()}`,
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  const email = uniqueEmail(`st-${tag}`)
  const password = 'Password123!'
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: `User ${tag}` } },
  })
  if (error || !data.user) throw new Error(`signUp failed: ${error?.message}`)
  return { client, user: data.user }
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
      title: 'Transition Studio',
      category: 'photography-studio',
      price_cents: 5000,
      location: 'Test City',
      booking_mode: 'request',
      status: 'published',
      ...overrides,
    })
    .select('id, booking_mode')
    .single()
  if (error) throw new Error(`createListing failed: ${error.message}`)
  return data as { id: string; booking_mode: 'instant' | 'request' }
}

async function createSlot(client: SupabaseClient, listingId: string) {
  const start = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  const end = new Date(new Date(start).getTime() + 2 * 60 * 60 * 1000).toISOString()
  const { data, error } = await client
    .from('availability_slots')
    .insert({ listing_id: listingId, start_time: start, end_time: end })
    .select('id')
    .single()
  if (error) throw new Error(`createSlot failed: ${error.message}`)
  return data as { id: string }
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
      stripe_payment_intent_id: `pi_test_st_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      amount_cents: 5000,
    })
    .select('id, status')
    .single()
  if (error) throw new Error(`createBooking failed: ${error.message}`)
  return data as { id: string; status: string }
}

// Mirrors the handler's preconditions: only `request` mode + `pending` status
// may be accepted or declined.
async function fetchAcceptableBooking(client: SupabaseClient, bookingId: string) {
  const { data, error } = await client
    .from('bookings')
    .select(
      `
      id,
      status,
      listing:listings(
        booking_mode
      )
    `,
    )
    .eq('id', bookingId)
    .single()

  if (error || !data) return null

  const listing = Array.isArray(data.listing) ? data.listing[0] : data.listing
  if (data.status !== 'pending' || listing?.booking_mode !== 'request') return null

  return data.id
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

describe('Seller accept/decline state transitions', () => {
  it('accept moves a pending request-mode booking to confirmed', async () => {
    const { client: sellerClient, user: seller } = await signUpUser('accept-seller')
    const { client: buyerClient, user: buyer } = await signUpUser('accept-buyer')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id, { booking_mode: 'request' })
    const slot = await createSlot(sellerClient, listing.id)
    const booking = await createBooking(buyerClient, {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: slot.id,
    })

    const acceptable = await fetchAcceptableBooking(sellerClient, booking.id)
    expect(acceptable).toBe(booking.id)

    const { data: updated, error } = await sellerClient
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', booking.id)
      .select('id, status')
      .single()

    expect(error).toBeNull()
    expect(updated!.status).toBe('confirmed')
  })

  it('decline moves a pending request-mode booking to cancelled', async () => {
    const { client: sellerClient, user: seller } = await signUpUser('decline-seller')
    const { client: buyerClient, user: buyer } = await signUpUser('decline-buyer')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id, { booking_mode: 'request' })
    const slot = await createSlot(sellerClient, listing.id)
    const booking = await createBooking(buyerClient, {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: slot.id,
    })

    const acceptable = await fetchAcceptableBooking(sellerClient, booking.id)
    expect(acceptable).toBe(booking.id)

    const { data: updated, error } = await sellerClient
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', booking.id)
      .select('id, status')
      .single()

    expect(error).toBeNull()
    expect(updated!.status).toBe('cancelled')
  })

  it('a pending booking on an instant-mode listing is not acceptable', async () => {
    const { client: sellerClient, user: seller } = await signUpUser('instant-seller')
    const { client: buyerClient, user: buyer } = await signUpUser('instant-buyer')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id, { booking_mode: 'instant' })
    const slot = await createSlot(sellerClient, listing.id)
    const booking = await createBooking(buyerClient, {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: slot.id,
    })

    const acceptable = await fetchAcceptableBooking(sellerClient, booking.id)
    expect(acceptable).toBeNull()
  })

  it('a non-pending booking on a request-mode listing is not acceptable', async () => {
    const { client: sellerClient, user: seller } = await signUpUser('confirmed-seller')
    const { client: buyerClient, user: buyer } = await signUpUser('confirmed-buyer')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id, { booking_mode: 'request' })
    const slot = await createSlot(sellerClient, listing.id)
    const booking = await createBooking(buyerClient, {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: slot.id,
      status: 'confirmed',
    })

    const acceptable = await fetchAcceptableBooking(sellerClient, booking.id)
    expect(acceptable).toBeNull()
  })

  it('another seller cannot update a booking on a listing they do not own (RLS)', async () => {
    const { client: seller1Client, user: seller1 } = await signUpUser('upd-seller1')
    const { client: seller2Client, user: seller2 } = await signUpUser('upd-seller2')
    const { client: buyerClient, user: buyer } = await signUpUser('upd-buyer')
    createdUserIds.push(seller1.id, seller2.id, buyer.id)

    const listing = await createListing(seller1Client, seller1.id, { booking_mode: 'request' })
    const slot = await createSlot(seller1Client, listing.id)
    const booking = await createBooking(buyerClient, {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: slot.id,
    })

    const { data, error } = await seller2Client
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', booking.id)
      .select()

    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})
