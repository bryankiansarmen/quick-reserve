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

async function signUpBuyer(tag: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storageKey: `test-buyer-${tag}-${Date.now()}`,
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  const email = uniqueEmail(`buyer-${tag}`)
  const password = 'Password123!'
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: `Buyer ${tag}` } },
  })
  if (error || !data.user) throw new Error(`signUp buyer failed: ${error?.message}`)
  return { client, user: data.user, email }
}

async function signUpSeller(tag: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storageKey: `test-seller-${tag}-${Date.now()}`,
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  const email = uniqueEmail(`seller-${tag}`)
  const password = 'Password123!'
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: `Seller ${tag}` } },
  })
  if (error || !data.user) throw new Error(`signUp seller failed: ${error?.message}`)
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

describe('bookings table — one_active_booking_per_slot constraint', () => {
  it('allows one non-cancelled booking per slot (serial)', async () => {
    const { client: sellerClient, user: seller } = await signUpSeller('constraint-serial')
    const { client: buyerClient, user: buyer } = await signUpBuyer('constraint-serial')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id)

    const bookingPayload = {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: slot.id,
      amount_cents: 5000,
    }

    const { data: first, error: firstErr } = await buyerClient
      .from('bookings')
      .insert(bookingPayload)
      .select()
      .single()

    expect(firstErr).toBeNull()
    expect(first).not.toBeNull()
    expect(first!.status).toBe('pending')

    const { error: secondErr } = await buyerClient
      .from('bookings')
      .insert(bookingPayload)

    expect(secondErr).not.toBeNull()
    expect(secondErr!.code).toBe('23505')
    expect(secondErr!.message).toContain('one_active_booking_per_slot')
  })

  it('allows booking after cancellation (serial)', async () => {
    const { client: sellerClient, user: seller } = await signUpSeller('cancel-then-book')
    const { client: buyerClient, user: buyer } = await signUpBuyer('cancel-then-book')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id)

    const { data: booking } = await buyerClient
      .from('bookings')
      .insert({
        listing_id: listing.id,
        buyer_id: buyer.id,
        slot_id: slot.id,
        amount_cents: 5000,
      })
      .select()
      .single()

    const { error: cancelErr } = await sellerClient
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', booking!.id)

    expect(cancelErr).toBeNull()

    const { error: secondErr } = await buyerClient
      .from('bookings')
      .insert({
        listing_id: listing.id,
        buyer_id: buyer.id,
        slot_id: slot.id,
        amount_cents: 5000,
      })

    expect(secondErr).toBeNull()
  })

  it('prevents concurrent double-booking on the same slot', async () => {
    const { client: sellerClient, user: seller } = await signUpSeller('concurrent')
    const { client: buyer1Client, user: buyer1 } = await signUpBuyer('concurrent-1')
    const { client: buyer2Client, user: buyer2 } = await signUpBuyer('concurrent-2')
    createdUserIds.push(seller.id, buyer1.id, buyer2.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id, 30, 60)

    const bookingPayload = {
      listing_id: listing.id,
      amount_cents: 5000,
    }

    const results = await Promise.allSettled([
      buyer1Client.from('bookings').insert({ ...bookingPayload, buyer_id: buyer1.id, slot_id: slot.id }),
      buyer2Client.from('bookings').insert({ ...bookingPayload, buyer_id: buyer2.id, slot_id: slot.id }),
    ])

    const successes = results.filter(
      (r) => r.status === 'fulfilled' && r.value.error === null,
    ).length
    const failures = results.filter(
      (r) =>
        r.status === 'fulfilled' &&
        r.value.error !== null &&
        r.value.error.code === '23505',
    ).length

    expect(successes).toBe(1)
    expect(failures).toBe(1)

    // Verify via each buyer's RLS-scoped query that exactly one booking exists
    const { data: b1data } = await buyer1Client
      .from('bookings')
      .select('id, status')
      .eq('slot_id', slot.id)

    const { data: b2data } = await buyer2Client
      .from('bookings')
      .select('id, status')
      .eq('slot_id', slot.id)

    const totalVisible = (b1data ?? []).length + (b2data ?? []).length
    expect(totalVisible).toBe(1)
  })

  it('allows multiple cancelled bookings on the same slot', async () => {
    const { client: sellerClient, user: seller } = await signUpSeller('multi-cancel')
    const { client: buyerClient, user: buyer } = await signUpBuyer('multi-cancel')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id)

    const bookingPayload = {
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: slot.id,
      amount_cents: 5000,
    }

    const { data: b1 } = await buyerClient
      .from('bookings')
      .insert(bookingPayload)
      .select()
      .single()

    await sellerClient.from('bookings').update({ status: 'cancelled' }).eq('id', b1!.id)

    const { data: b2 } = await buyerClient
      .from('bookings')
      .insert(bookingPayload)
      .select()
      .single()

    await sellerClient.from('bookings').update({ status: 'cancelled' }).eq('id', b2!.id)

    const { data: b3 } = await buyerClient
      .from('bookings')
      .insert(bookingPayload)
      .select()
      .single()

    expect(b3).not.toBeNull()
    expect(b3!.status).toBe('pending')
  })
})

describe('bookings table — RLS policies for SELECT', () => {
  it('buyer can read their own bookings', async () => {
    const { client: sellerClient, user: seller } = await signUpSeller('rlx-sel-own')
    const { client: buyerClient, user: buyer } = await signUpBuyer('rlx-sel-own')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id)

    await buyerClient.from('bookings').insert({
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: slot.id,
      amount_cents: 5000,
    })

    const { data, error } = await buyerClient
      .from('bookings')
      .select('*')
      .eq('slot_id', slot.id)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].buyer_id).toBe(buyer.id)
  })

  it('buyer cannot read another buyer\'s bookings', async () => {
    const { client: sellerClient, user: seller } = await signUpSeller('rlx-sel-cross')
    const { client: buyer1Client, user: buyer1 } = await signUpBuyer('rlx-sel-cross-1')
    const { client: buyer2Client, user: buyer2 } = await signUpBuyer('rlx-sel-cross-2')
    createdUserIds.push(seller.id, buyer1.id, buyer2.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id)

    await buyer1Client.from('bookings').insert({
      listing_id: listing.id,
      buyer_id: buyer1.id,
      slot_id: slot.id,
      amount_cents: 5000,
    })

    const { data, error } = await buyer2Client
      .from('bookings')
      .select('*')
      .eq('slot_id', slot.id)

    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it('seller can read bookings on their own listings', async () => {
    const { client: sellerClient, user: seller } = await signUpSeller('rlx-sel-seller')
    const { client: buyerClient, user: buyer } = await signUpBuyer('rlx-sel-seller')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id)

    await buyerClient.from('bookings').insert({
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: slot.id,
      amount_cents: 5000,
    })

    const { data, error } = await sellerClient
      .from('bookings')
      .select('*')
      .eq('listing_id', listing.id)

    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('seller cannot read bookings on another seller\'s listing', async () => {
    const { client: seller1Client, user: seller1 } = await signUpSeller('rlx-sel-cross-a')
    const { client: seller2Client, user: seller2 } = await signUpSeller('rlx-sel-cross-b')
    const { client: buyerClient, user: buyer } = await signUpBuyer('rlx-sel-cross-buy')
    createdUserIds.push(seller1.id, seller2.id, buyer.id)

    // listing1 intentionally omitted — only seller2's listing is used for the booking
    const listing2 = await createListing(seller2Client, seller2.id)
    const slot2 = await createSlot(seller2Client, listing2.id)

    await buyerClient.from('bookings').insert({
      listing_id: listing2.id,
      buyer_id: buyer.id,
      slot_id: slot2.id,
      amount_cents: 5000,
    })

    const { data, error } = await seller1Client
      .from('bookings')
      .select('*')
      .eq('listing_id', listing2.id)

    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })
})

describe('bookings table — RLS policies for INSERT', () => {
  it('buyer can create booking for themselves', async () => {
    const { client: sellerClient, user: seller } = await signUpSeller('rlx-ins-own')
    const { client: buyerClient, user: buyer } = await signUpBuyer('rlx-ins-own')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id)

    const { data, error } = await buyerClient
      .from('bookings')
      .insert({
        listing_id: listing.id,
        buyer_id: buyer.id,
        slot_id: slot.id,
        amount_cents: 5000,
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data!.buyer_id).toBe(buyer.id)
  })

  it('buyer cannot create booking with another user as buyer_id', async () => {
    const { client: sellerClient, user: seller } = await signUpSeller('rlx-ins-other')
    const { client: buyer1Client, user: buyer1 } = await signUpBuyer('rlx-ins-other-1')
    const { user: buyer2 } = await signUpBuyer('rlx-ins-other-2')
    createdUserIds.push(seller.id, buyer1.id, buyer2.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id)

    const { error } = await buyer1Client
      .from('bookings')
      .insert({
        listing_id: listing.id,
        buyer_id: buyer2.id,
        slot_id: slot.id,
        amount_cents: 5000,
      })
      .select()
      .single()

    expect(error).not.toBeNull()
  })
})

describe('bookings table — RLS policies for UPDATE', () => {
  it('seller can update booking status on their listing\'s booking', async () => {
    const { client: sellerClient, user: seller } = await signUpSeller('rlx-upd-own')
    const { client: buyerClient, user: buyer } = await signUpBuyer('rlx-upd-own')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id)

    const { data: booking } = await buyerClient
      .from('bookings')
      .insert({
        listing_id: listing.id,
        buyer_id: buyer.id,
        slot_id: slot.id,
        amount_cents: 5000,
      })
      .select()
      .single()

    const { data: updated, error } = await sellerClient
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', booking!.id)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updated!.status).toBe('confirmed')
  })

  it('buyer cannot update booking status', async () => {
    const { client: sellerClient, user: seller } = await signUpSeller('rlx-upd-buyer')
    const { client: buyerClient, user: buyer } = await signUpBuyer('rlx-upd-buyer')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id)

    const { data: booking } = await buyerClient
      .from('bookings')
      .insert({
        listing_id: listing.id,
        buyer_id: buyer.id,
        slot_id: slot.id,
        amount_cents: 5000,
      })
      .select()
      .single()

    const { data: result, error } = await buyerClient
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', booking!.id)
      .select()

    expect(error).toBeNull()
    expect(result).toEqual([])
  })
})

describe('bookings table — anonymous access', () => {
  it('anonymous cannot read bookings', async () => {
    const { client: sellerClient, user: seller } = await signUpSeller('anon-sel')
    const { client: buyerClient, user: buyer } = await signUpBuyer('anon-sel')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id)

    await buyerClient.from('bookings').insert({
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: slot.id,
      amount_cents: 5000,
    })

    const anonClient = createAnonClient()
    const { data, error } = await anonClient.from('bookings').select('*').limit(1)

    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('anonymous cannot insert bookings', async () => {
    const { client: sellerClient, user: seller } = await signUpSeller('anon-ins')
    const { user: buyer } = await signUpBuyer('anon-ins')
    createdUserIds.push(seller.id, buyer.id)

    const listing = await createListing(sellerClient, seller.id)
    const slot = await createSlot(sellerClient, listing.id)

    const anonClient = createAnonClient()
    const { error } = await anonClient.from('bookings').insert({
      listing_id: listing.id,
      buyer_id: buyer.id,
      slot_id: slot.id,
      amount_cents: 5000,
    })

    expect(error).not.toBeNull()
  })
})
