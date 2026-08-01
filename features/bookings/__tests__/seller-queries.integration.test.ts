import { describe, it, expect, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getSellerBookings } from '../queries'

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
      storageKey: `test-sb-${tag}-${Date.now()}`,
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  const email = uniqueEmail(`sb-${tag}`)
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
      title: 'Seller Booking Studio',
      category: 'photography-studio',
      price_cents: 7500,
      location: 'Test City',
      booking_mode: 'request',
      status: 'published',
      images: ['https://example.com/photo-1.jpg', 'https://example.com/photo-2.jpg'],
      ...overrides,
    })
    .select('id, title, booking_mode')
    .single()
  if (error) throw new Error(`createListing failed: ${error.message}`)
  return data as { id: string; title: string; booking_mode: 'instant' | 'request' }
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
      stripe_payment_intent_id: `pi_test_sb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
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

describe('getSellerBookings', () => {
  it('returns only bookings on the authenticated seller\'s own listings (RLS scoping)', async () => {
    const { client: sellerClient, user: seller } = await signUpUser('scoping-seller')
    const { client: buyerClient, user: buyer } = await signUpUser('scoping-buyer')
    createdUserIds.push(seller.id, buyer.id)

    const listing1 = await createListing(sellerClient, seller.id)
    const listing2 = await createListing(sellerClient, seller.id, { title: 'Second Listing' })
    const slot1 = await createSlot(sellerClient, listing1.id, futureTime(1, 0))
    const slot2 = await createSlot(sellerClient, listing2.id, futureTime(1, 0))

    const ownBooking1 = await createBooking(buyerClient, {
      listing_id: listing1.id,
      buyer_id: buyer.id,
      slot_id: slot1.id,
    })
    const ownBooking2 = await createBooking(buyerClient, {
      listing_id: listing2.id,
      buyer_id: buyer.id,
      slot_id: slot2.id,
    })

    const result = await getSellerBookings(sellerClient)

    const allIds = [...result.pending, ...result.other].map((b) => b.id)
    expect(allIds).toHaveLength(2)
    expect(allIds).toContain(ownBooking1.id)
    expect(allIds).toContain(ownBooking2.id)
  })

  it('excludes bookings on another seller\'s listing (negative RLS)', async () => {
    const { client: seller1Client, user: seller1 } = await signUpUser('neg-seller1')
    const { client: seller2Client, user: seller2 } = await signUpUser('neg-seller2')
    const { client: buyerClient, user: buyer } = await signUpUser('neg-buyer')
    createdUserIds.push(seller1.id, seller2.id, buyer.id)

    const listing1 = await createListing(seller1Client, seller1.id)
    const listing2 = await createListing(seller2Client, seller2.id, { title: 'Other Seller Studio' })

    const slot1 = await createSlot(seller1Client, listing1.id, futureTime(1, 0))
    const slot2 = await createSlot(seller2Client, listing2.id, futureTime(1, 0))

    const ownBooking = await createBooking(buyerClient, {
      listing_id: listing1.id,
      buyer_id: buyer.id,
      slot_id: slot1.id,
    })
    const otherBooking = await createBooking(buyerClient, {
      listing_id: listing2.id,
      buyer_id: buyer.id,
      slot_id: slot2.id,
    })

    const result = await getSellerBookings(seller1Client)

    const allIds = [...result.pending, ...result.other].map((b) => b.id)
    expect(allIds).toContain(ownBooking.id)
    expect(allIds).not.toContain(otherBooking.id)
  })

  it('returns empty lists when the seller has no bookings', async () => {
    const { client: sellerClient, user: seller } = await signUpUser('empty-seller')
    createdUserIds.push(seller.id)

    const result = await getSellerBookings(sellerClient)

    expect(result.pending).toHaveLength(0)
    expect(result.other).toHaveLength(0)
  })

  it('splits pending bookings from everything else', async () => {
    const { client: sellerClient, user: seller } = await signUpUser('split-seller')
    const { client: buyerClient, user: buyer } = await signUpUser('split-buyer')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id)

    const pendingSlot = await createSlot(sellerClient, listing.id, futureTime(1, 0))
    const confirmedSlot = await createSlot(sellerClient, listing.id, futureTime(1, 3))
    const cancelledSlot = await createSlot(sellerClient, listing.id, futureTime(1, 6))

    const pendingBooking = await createBooking(buyerClient, {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: pendingSlot.id,
      status: 'pending',
    })
    const confirmedBooking = await createBooking(buyerClient, {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: confirmedSlot.id,
      status: 'confirmed',
    })
    const cancelledBooking = await createBooking(buyerClient, {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: cancelledSlot.id,
      status: 'cancelled',
    })

    const result = await getSellerBookings(sellerClient)

    expect(result.pending.map((b) => b.id)).toEqual([pendingBooking.id])
    expect(result.other.map((b) => b.id).sort()).toEqual(
      [confirmedBooking.id, cancelledBooking.id].sort(),
    )
  })

  it('denormalizes listing, slot, and buyer fields into each list item', async () => {
    const { client: sellerClient, user: seller } = await signUpUser('denorm-seller')
    const { client: buyerClient, user: buyer } = await signUpUser('denorm-buyer')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id, {
      title: 'Sunlit Studio',
      location: 'Downtown',
      booking_mode: 'request',
    })
    const slot = await createSlot(sellerClient, listing.id, futureTime(1))
    const booking = await createBooking(buyerClient, {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: slot.id,
      amount_cents: 9900,
    })

    const { data: profile } = await buyerClient
      .from('profiles')
      .select('full_name')
      .eq('id', buyer.id)
      .single()

    const result = await getSellerBookings(sellerClient)

    const item = [...result.pending, ...result.other].find((b) => b.id === booking.id)
    expect(item).toBeDefined()
    expect(item!.status).toBe('pending')
    expect(item!.amount_cents).toBe(9900)
    expect(item!.booking_mode).toBe('request')
    expect(item!.listing.id).toBe(listing.id)
    expect(item!.listing.title).toBe('Sunlit Studio')
    expect(item!.listing.location).toBe('Downtown')
    // First image from the array is selected for the thumbnail
    expect(item!.listing.image).toBe('https://example.com/photo-1.jpg')
    expect(item!.slot.start_time).toBe(slot.start_time)
    expect(item!.slot.end_time).toBe(slot.end_time)
    expect(item!.buyer.full_name).toBe(profile?.full_name)
  })
})
