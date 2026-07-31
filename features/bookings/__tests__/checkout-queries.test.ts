import { describe, it, expect, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getCheckoutBooking } from '../queries'

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
      storageKey: `test-co-buyer-${tag}-${Date.now()}`,
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  const email = uniqueEmail(`co-buyer-${tag}`)
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
      storageKey: `test-co-seller-${tag}-${Date.now()}`,
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  const email = uniqueEmail(`co-seller-${tag}`)
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
      title: 'Checkout Studio',
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

async function createSlot(client: SupabaseClient, listingId: string) {
  const start = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  const end = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
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
  },
) {
  const { data, error } = await client
    .from('bookings')
    .insert({
      listing_id: booking.listing_id,
      buyer_id: booking.buyer_id,
      slot_id: booking.slot_id,
      status: 'pending',
      stripe_payment_intent_id: `pi_test_co_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      amount_cents: booking.amount_cents ?? 7500,
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

describe('getCheckoutBooking', () => {
  it('returns denormalized checkout data for the buyer-owned booking', async () => {
    const { client: sellerClient, user: seller } = await signUpSeller('denorm')
    const { client: buyerClient, user: buyer } = await signUpBuyer('denorm')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id)
    const booking = await createBooking(buyerClient, {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: slot.id,
    })

    const result = await getCheckoutBooking(buyerClient, booking.id)

    expect(result).not.toBeNull()
    expect(result!.booking.id).toBe(booking.id)
    expect(result!.booking.status).toBe('pending')
    expect(result!.booking.amount_cents).toBe(7500)
    expect(result!.booking.stripe_payment_intent_id).toMatch(/^pi_test_co_/)
    expect(result!.listing.id).toBe(listing.id)
    expect(result!.listing.title).toBe(listing.title)
    // First image from the array is selected for the summary
    expect(result!.listing.image).toBe('https://example.com/photo-1.jpg')
    expect(result!.slot.id).toBe(slot.id)
    expect(result!.slot.start_time).toBe(slot.start_time)
    expect(result!.slot.end_time).toBe(slot.end_time)
    expect(result!.seller.full_name).toBe(`Seller denorm`)
  })

  it('returns null for a non-existent booking', async () => {
    const { client: buyerClient, user: buyer } = await signUpBuyer('missing')
    createdUserIds.push(buyer.id)

    const result = await getCheckoutBooking(buyerClient, '00000000-0000-0000-0000-000000000000')

    expect(result).toBeNull()
  })

  it('returns null when a different buyer tries to access the booking (RLS)', async () => {
    const { client: sellerClient, user: seller } = await signUpSeller('rls-owner')
    const { client: buyer1Client, user: buyer1 } = await signUpBuyer('rls-owner')
    const { client: buyer2Client, user: buyer2 } = await signUpBuyer('rls-other')
    createdUserIds.push(seller.id, buyer1.id, buyer2.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id)
    const booking = await createBooking(buyer1Client, {
      listing_id: listing.id,
      buyer_id: buyer1.id,
      slot_id: slot.id,
    })

    const result = await getCheckoutBooking(buyer2Client, booking.id)

    expect(result).toBeNull()
  })

  it('returns data for a confirmed booking (success page can render)', async () => {
    const { client: sellerClient, user: seller } = await signUpSeller('confirmed')
    const { client: buyerClient, user: buyer } = await signUpBuyer('confirmed')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id)

    const { data: booking, error } = await buyerClient
      .from('bookings')
      .insert({
        listing_id: listing.id,
        buyer_id: buyer.id,
        slot_id: slot.id,
        status: 'confirmed',
        stripe_payment_intent_id: `pi_test_co_conf_${Date.now()}`,
        amount_cents: 7500,
      })
      .select('id')
      .single()
    if (error) throw new Error(`create confirmed booking failed: ${error.message}`)

    const result = await getCheckoutBooking(buyerClient, booking.id)

    expect(result).not.toBeNull()
    expect(result!.booking.status).toBe('confirmed')
  })

  it('uses the first image only when multiple images exist', async () => {
    const { client: sellerClient, user: seller } = await signUpSeller('multi-img')
    const { client: buyerClient, user: buyer } = await signUpBuyer('multi-img')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id, {
      images: ['https://example.com/first.jpg', 'https://example.com/second.jpg'],
    })
    const slot = await createSlot(sellerClient, listing.id)
    const booking = await createBooking(buyerClient, {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: slot.id,
    })

    const result = await getCheckoutBooking(buyerClient, booking.id)

    expect(result!.listing.image).toBe('https://example.com/first.jpg')
  })
})
