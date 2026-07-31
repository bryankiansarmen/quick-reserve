import { describe, it, expect, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getBuyerBookings } from '../queries'

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

async function signUpBuyer(tag: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storageKey: `test-bb-buyer-${tag}-${Date.now()}`,
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  const email = uniqueEmail(`bb-buyer-${tag}`)
  const password = 'Password123!'
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: `Buyer ${tag}` } },
  })
  if (error || !data.user) throw new Error(`signUp buyer failed: ${error?.message}`)
  return { client, user: data.user }
}

async function signUpSeller(tag: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storageKey: `test-bb-seller-${tag}-${Date.now()}`,
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  const email = uniqueEmail(`bb-seller-${tag}`)
  const password = 'Password123!'
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: `Seller ${tag}` } },
  })
  if (error || !data.user) throw new Error(`signUp seller failed: ${error?.message}`)
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
      title: 'Buyer Booking Studio',
      category: 'photography-studio',
      price_cents: 7500,
      location: 'Test City',
      booking_mode: 'instant',
      status: 'published',
      images: ['https://example.com/photo-1.jpg', 'https://example.com/photo-2.jpg'],
      ...overrides,
    })
    .select('id, title')
    .single()
  if (error) throw new Error(`createListing failed: ${error.message}`)
  return data as { id: string; title: string }
}

async function createSlot(client: SupabaseClient, listingId: string, startTime?: string) {
  const start = startTime ?? new Date(Date.now() + 60 * 60 * 1000).toISOString()
  const end = new Date(new Date(start).getTime() + 2 * 60 * 60 * 1000).toISOString()
  const { data, error } = await client
    .from('availability_slots')
    .insert({ listing_id: listingId, start_time: start, end_time: end })
    .select('id, start_time, end_time')
    .single()
  if (error) throw new Error(`createSlot failed: ${error.message}`)
  return data as { id: string; start_time: string; end_time: string }
}

async function createBooking(
  client: SupabaseClient,
  booking: {
    listing_id: string
    buyer_id: string
    slot_id: string
    amount_cents?: number
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
      stripe_payment_intent_id: `pi_test_bb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      amount_cents: booking.amount_cents ?? 7500,
    })
    .select('id')
    .single()
  if (error) throw new Error(`createBooking failed: ${error.message}`)
  return data as { id: string }
}

function futureTime(days: number, hours = 0): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  d.setUTCHours(10 + hours, 0, 0, 0)
  return d.toISOString()
}

function pastTime(daysAgo: number): string {
  const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
  d.setUTCHours(10, 0, 0, 0)
  return d.toISOString()
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

describe('getBuyerBookings', () => {
  it('returns only the authenticated buyer\'s own bookings (RLS scoping)', async () => {
    const { client: sellerClient, user: seller } = await signUpSeller('scoping')
    const { client: buyer1Client, user: buyer1 } = await signUpBuyer('scoping-owner')
    const { client: buyer2Client, user: buyer2 } = await signUpBuyer('scoping-other')
    createdUserIds.push(seller.id, buyer1.id, buyer2.id)

    const listing1 = await createListing(sellerClient, seller.id)
    const listing2 = await createListing(sellerClient, seller.id, { title: 'Second Listing' })

    const slot1 = await createSlot(sellerClient, listing1.id, futureTime(1, 0))
    const slot2 = await createSlot(sellerClient, listing1.id, futureTime(1, 3))
    const slot3 = await createSlot(sellerClient, listing2.id, futureTime(1, 0))

    const ownBooking1 = await createBooking(buyer1Client, {
      listing_id: listing1.id,
      buyer_id: buyer1.id,
      slot_id: slot1.id,
    })
    const ownBooking2 = await createBooking(buyer1Client, {
      listing_id: listing1.id,
      buyer_id: buyer1.id,
      slot_id: slot2.id,
    })
    const otherBooking = await createBooking(buyer2Client, {
      listing_id: listing2.id,
      buyer_id: buyer2.id,
      slot_id: slot3.id,
    })

    const result = await getBuyerBookings(buyer1Client)

    const allIds = [...result.upcoming, ...result.past].map((b) => b.id)
    expect(allIds).toHaveLength(2)
    expect(allIds).toContain(ownBooking1.id)
    expect(allIds).toContain(ownBooking2.id)
    expect(allIds).not.toContain(otherBooking.id)
  })

  it('returns empty lists when the buyer has no bookings', async () => {
    const { client: buyerClient, user: buyer } = await signUpBuyer('empty')
    createdUserIds.push(buyer.id)

    const result = await getBuyerBookings(buyerClient)

    expect(result.upcoming).toHaveLength(0)
    expect(result.past).toHaveLength(0)
  })

  it('excludes another buyer\'s booking on the same listing (negative RLS)', async () => {
    const { client: sellerClient, user: seller } = await signUpSeller('neg-rls')
    const { client: buyer1Client, user: buyer1 } = await signUpBuyer('neg-rls-owner')
    const { client: buyer2Client, user: buyer2 } = await signUpBuyer('neg-rls-other')
    createdUserIds.push(seller.id, buyer1.id, buyer2.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot1 = await createSlot(sellerClient, listing.id, futureTime(1, 0))
    const slot2 = await createSlot(sellerClient, listing.id, futureTime(1, 3))

    const buyer1Booking = await createBooking(buyer1Client, {
      listing_id: listing.id,
      buyer_id: buyer1.id,
      slot_id: slot1.id,
    })
    const buyer2Booking = await createBooking(buyer2Client, {
      listing_id: listing.id,
      buyer_id: buyer2.id,
      slot_id: slot2.id,
    })

    const result = await getBuyerBookings(buyer1Client)

    const allIds = [...result.upcoming, ...result.past].map((b) => b.id)
    expect(allIds).toContain(buyer1Booking.id)
    expect(allIds).not.toContain(buyer2Booking.id)
  })

  it('splits upcoming vs past based on slot start time and status', async () => {
    const { client: sellerClient, user: seller } = await signUpSeller('split')
    const { client: buyerClient, user: buyer } = await signUpBuyer('split')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id)

    const futureSlot = await createSlot(sellerClient, listing.id, futureTime(1))
    const pastSlot = await createSlot(sellerClient, listing.id, pastTime(1))
    const futureCancelledSlot = await createSlot(sellerClient, listing.id, futureTime(2))

    const upcomingBooking = await createBooking(buyerClient, {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: futureSlot.id,
      status: 'pending',
    })
    const pastBooking = await createBooking(buyerClient, {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: pastSlot.id,
      status: 'confirmed',
    })
    const cancelledBooking = await createBooking(buyerClient, {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: futureCancelledSlot.id,
      status: 'cancelled',
    })

    const result = await getBuyerBookings(buyerClient)

    expect(result.upcoming.map((b) => b.id)).toEqual([upcomingBooking.id])
    expect(result.past.map((b) => b.id).sort()).toEqual(
      [pastBooking.id, cancelledBooking.id].sort(),
    )
  })

  it('denormalizes listing and slot fields into each list item', async () => {
    const { client: sellerClient, user: seller } = await signUpSeller('denorm')
    const { client: buyerClient, user: buyer } = await signUpBuyer('denorm')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id, {
      title: 'Sunlit Studio',
      location: 'Downtown',
    })
    const slot = await createSlot(sellerClient, listing.id, futureTime(1))
    const booking = await createBooking(buyerClient, {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: slot.id,
      amount_cents: 9900,
    })

    const result = await getBuyerBookings(buyerClient)

    const item = [...result.upcoming, ...result.past].find((b) => b.id === booking.id)
    expect(item).toBeDefined()
    expect(item!.status).toBe('pending')
    expect(item!.amount_cents).toBe(9900)
    expect(item!.listing.id).toBe(listing.id)
    expect(item!.listing.title).toBe('Sunlit Studio')
    expect(item!.listing.location).toBe('Downtown')
    // First image from the array is selected for the thumbnail
    expect(item!.listing.image).toBe('https://example.com/photo-1.jpg')
    expect(item!.slot.start_time).toBe(slot.start_time)
    expect(item!.slot.end_time).toBe(slot.end_time)
    expect(item!.created_at).toBeTruthy()
  })
})
