import { describe, it, expect, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * POST /api/bookings HTTP endpoint tests.
 *
 * Requires a running dev server on http://localhost:3000 plus a live local
 * Supabase stack and a Stripe secret key. Gated behind TEST_INTEGRATION=true
 * (plus STRIPE_SECRET_KEY for payment tests). Runs via `npm run test:api`.
 * Excluded from the default `npm test`.
 */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hj04zWl196z2-SBc0'

const isIntegrationTest = process.env.TEST_INTEGRATION === 'true' && !!process.env.STRIPE_SECRET_KEY

function uniqueEmail(tag: string): string {
  return `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}@example.com`
}

async function signUpSeller(tag: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storageKey: `test-api-seller-${tag}-${Date.now()}`,
      persistSession: false,
      autoRefreshToken: false,
    },
  })
  const email = uniqueEmail(`api-seller-${tag}`)
  const password = 'Password123!'
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: `Seller ${tag}` } },
  })
  if (error || !data.user) throw new Error(`signUp seller failed: ${error?.message}`)
  return { client, user: data.user, email, password }
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
    .select('id, price_cents, title')
    .single()
  if (error) throw new Error(`createListing failed: ${error.message}`)
  return data as { id: string; price_cents: number; title: string }
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
    .select('id, start_time, listing_id')
    .single()
  if (error) throw new Error(`createSlot failed: ${error.message}`)
  return data as { id: string; start_time: string; listing_id: string }
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

describe('POST /api/bookings - HTTP endpoint', () => {
  async function signUpAndGetSession(tag: string) {
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storageKey: `test-http-${tag}-${Date.now()}`,
        persistSession: false,
        autoRefreshToken: false,
      },
    })
    const email = uniqueEmail(`http-${tag}`)
    const password = 'Password123!'
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: { full_name: `HTTP ${tag}` } },
    })
    if (error || !data.session || !data.user) {
      throw new Error(`signUp failed: ${error?.message}`)
    }
    return { client, user: data.user, email, password, session: data.session }
  }

  async function makeApiRequest(
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

    const response = await fetch('http://localhost:3000/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `${cookieName}=${encodeURIComponent(cookieValue)}`,
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    return { status: response.status, data }
  }

  it.skipIf(!isIntegrationTest)(
    'returns 201 with booking_id and client_secret',
    async () => {
      const { client: sellerClient, user: seller } = await signUpSeller('http-success')
      const { user, session } = await signUpAndGetSession('http-success')
      createdUserIds.push(seller.id, user.id)

      const listing = await createListing(sellerClient, seller.id)
      const slot = await createSlot(sellerClient, listing.id)

      const { status, data } = await makeApiRequest(session, {
        listing_id: listing.id,
        slot_id: slot.id,
      })

      expect(status).toBe(201)
      expect(data).toHaveProperty('booking_id')
      expect(data).toHaveProperty('client_secret')
      expect(typeof data.booking_id).toBe('string')
      expect(typeof data.client_secret).toBe('string')
    },
  )

  it.skipIf(!isIntegrationTest)(
    'returns 401 for unauthenticated request',
    async () => {
      const response = await fetch('http://localhost:3000/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: '00000000-0000-0000-0000-000000000001',
          slot_id: '00000000-0000-0000-0000-000000000002',
        }),
      })

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error.code).toBe('UNAUTHENTICATED')
    },
  )

  it.skipIf(!isIntegrationTest)(
    'returns 400 for invalid listing_id',
    async () => {
      const { session } = await signUpAndGetSession('http-bad-uuid')
      createdUserIds.push((await signUpAndGetSession('http-bad-uuid-holder')).user.id)

      const { status, data } = await makeApiRequest(session, {
        listing_id: 'not-a-uuid',
        slot_id: '00000000-0000-0000-0000-000000000001',
      })

      expect(status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    },
  )

  it.skipIf(!isIntegrationTest)(
    'returns 400 for missing body fields',
    async () => {
      const { session } = await signUpAndGetSession('http-missing')

      const { status, data } = await makeApiRequest(session, {})

      expect(status).toBe(400)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    },
  )
})
