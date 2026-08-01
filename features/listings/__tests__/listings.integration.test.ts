import { describe, it, expect, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
// Service-role key is used ONLY for test cleanup (deleting test users).
// It is never used in application code — only present here to isolate tests.
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hj04zWl196z2-SBc0'

/** Create a brand-new authenticated Supabase client for a test user. */
async function signUpSeller(tag: string) {
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storageKey: `test-${tag}-${Date.now()}`, // Unique storage per client
      persistSession: false, // Don't persist between tests
      autoRefreshToken: false, // Not needed for short-lived tests
    },
  })
  const email = `seller-${tag}-${Date.now()}@example.com`
  const password = 'Password123!'
  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: { data: { full_name: `Seller ${tag}` } },
  })
  if (error || !data.user) throw new Error(`signUp failed: ${error?.message}`)
  return { client, user: data.user, email }
}

/** Minimal valid listing payload for a given seller_id. */
function listingPayload(sellerId: string, overrides: Record<string, unknown> = {}) {
  return {
    seller_id: sellerId,
    title: 'Test Listing',
    category: 'studio',
    price_cents: 5000,
    location: 'Test City',
    booking_mode: 'instant',
    status: 'draft',
    ...overrides,
  }
}

// Track created user IDs for cleanup
const createdUserIds: string[] = []

afterAll(async () => {
  // Clean up all test users created during the suite using the service role key.
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  for (const id of createdUserIds) {
    await adminClient.auth.admin.deleteUser(id)
  }
})

describe('Listings Table RLS Integration Tests', () => {
  it('anonymous user cannot select a draft listing', async () => {
    const { client: sellerClient, user } = await signUpSeller('anon-draft')
    createdUserIds.push(user.id)

    // Seller inserts a draft listing
    const { data: inserted, error: insertErr } = await sellerClient
      .from('listings')
      .insert(listingPayload(user.id))
      .select()
      .single()
    expect(insertErr).toBeNull()
    expect(inserted).not.toBeNull()

    // Anonymous client tries to read it
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data, error } = await anonClient
      .from('listings')
      .select('*')
      .eq('id', inserted!.id)
      .maybeSingle()

    // RLS should block the row — returns null, not an error
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('anonymous user can select a published listing', async () => {
    const { client: sellerClient, user } = await signUpSeller('anon-published')
    createdUserIds.push(user.id)

    const { data: inserted, error: insertErr } = await sellerClient
      .from('listings')
      .insert(listingPayload(user.id, { status: 'published' }))
      .select()
      .single()
    expect(insertErr).toBeNull()

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data, error } = await anonClient
      .from('listings')
      .select('*')
      .eq('id', inserted!.id)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data!.id).toBe(inserted!.id)
  })

  it('seller can select their own draft listing', async () => {
    const { client: sellerClient, user } = await signUpSeller('own-draft-read')
    createdUserIds.push(user.id)

    const { data: inserted, error: insertErr } = await sellerClient
      .from('listings')
      .insert(listingPayload(user.id))
      .select()
      .single()
    expect(insertErr).toBeNull()

    const { data, error } = await sellerClient
      .from('listings')
      .select('*')
      .eq('id', inserted!.id)
      .single()

    expect(error).toBeNull()
    expect(data!.id).toBe(inserted!.id)
  })

  it("seller A cannot select seller B's draft listing", async () => {
    const { client: sellerAClient, user: userA } = await signUpSeller('a-cant-read-b')
    const { client: sellerBClient, user: userB } = await signUpSeller('b-has-draft')
    createdUserIds.push(userA.id, userB.id)

    // Seller B creates a draft
    const { data: bListing, error: bInsertErr } = await sellerBClient
      .from('listings')
      .insert(listingPayload(userB.id))
      .select()
      .single()
    expect(bInsertErr).toBeNull()

    // Seller A tries to read it
    const { data, error } = await sellerAClient
      .from('listings')
      .select('*')
      .eq('id', bListing!.id)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data).toBeNull() // Blocked by RLS
  })

  it('seller can insert a listing with their own seller_id', async () => {
    const { client: sellerClient, user } = await signUpSeller('insert-own')
    createdUserIds.push(user.id)

    const { data, error } = await sellerClient
      .from('listings')
      .insert(listingPayload(user.id))
      .select()
      .single()

    expect(error).toBeNull()
    expect(data).not.toBeNull()
    expect(data!.seller_id).toBe(user.id)
  })

  it("seller A cannot insert a listing with seller B's seller_id", async () => {
    const { client: sellerAClient, user: userA } = await signUpSeller('insert-other-a')
    const { user: userB } = await signUpSeller('insert-other-b')
    createdUserIds.push(userA.id, userB.id)

    // Seller A tries to insert with Seller B's ID
    const { error } = await sellerAClient
      .from('listings')
      .insert(listingPayload(userB.id))
      .select()
      .single()

    // RLS WITH CHECK should reject this
    expect(error).not.toBeNull()
  })

  it('seller can update their own listing', async () => {
    const { client: sellerClient, user } = await signUpSeller('update-own')
    createdUserIds.push(user.id)

    const { data: inserted } = await sellerClient
      .from('listings')
      .insert(listingPayload(user.id))
      .select()
      .single()

    const { data: updated, error } = await sellerClient
      .from('listings')
      .update({ title: 'Updated Title' })
      .eq('id', inserted!.id)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updated!.title).toBe('Updated Title')
  })

  it("seller A cannot update seller B's listing", async () => {
    const { client: sellerAClient, user: userA } = await signUpSeller('update-other-a')
    const { client: sellerBClient, user: userB } = await signUpSeller('update-other-b')
    createdUserIds.push(userA.id, userB.id)

    const { data: bListing } = await sellerBClient
      .from('listings')
      .insert(listingPayload(userB.id))
      .select()
      .single()

    const { data: result, error } = await sellerAClient
      .from('listings')
      .update({ title: 'Hacked Title' })
      .eq('id', bListing!.id)
      .select()

    expect(error).toBeNull()
    expect(result).toEqual([]) // 0 rows affected — RLS blocks the update
  })

  it('seller can delete their own listing', async () => {
    const { client: sellerClient, user } = await signUpSeller('delete-own')
    createdUserIds.push(user.id)

    const { data: inserted } = await sellerClient
      .from('listings')
      .insert(listingPayload(user.id))
      .select()
      .single()

    const { error: deleteError } = await sellerClient
      .from('listings')
      .delete()
      .eq('id', inserted!.id)

    expect(deleteError).toBeNull()

    // Verify it's gone
    const { data: gone } = await sellerClient
      .from('listings')
      .select('*')
      .eq('id', inserted!.id)
      .maybeSingle()

    expect(gone).toBeNull()
  })

  it("seller A cannot delete seller B's listing", async () => {
    const { client: sellerAClient, user: userA } = await signUpSeller('delete-other-a')
    const { client: sellerBClient, user: userB } = await signUpSeller('delete-other-b')
    createdUserIds.push(userA.id, userB.id)

    const { data: bListing } = await sellerBClient
      .from('listings')
      .insert(listingPayload(userB.id))
      .select()
      .single()

    const { error: deleteError } = await sellerAClient
      .from('listings')
      .delete()
      .eq('id', bListing!.id)

    // Supabase returns no error for RLS-blocked deletes, but 0 rows are affected.
    expect(deleteError).toBeNull()

    // Verify Seller B's listing is still there (check with Seller B's client)
    const { data: stillExists } = await sellerBClient
      .from('listings')
      .select('*')
      .eq('id', bListing!.id)
      .maybeSingle()

    expect(stillExists).not.toBeNull()
    expect(stillExists!.id).toBe(bListing!.id)
  })

  it('anonymous user cannot select an archived listing', async () => {
    const { client: sellerClient, user } = await signUpSeller('anon-archived')
    createdUserIds.push(user.id)

    // Seller creates a listing and then archives it
    const { data: inserted, error: insertErr } = await sellerClient
      .from('listings')
      .insert(listingPayload(user.id, { status: 'archived' }))
      .select()
      .single()
    expect(insertErr).toBeNull()

    // Anonymous client tries to read the archived listing
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data, error } = await anonClient
      .from('listings')
      .select('*')
      .eq('id', inserted!.id)
      .maybeSingle()

    // RLS should block the row — returns null, not an error
    expect(error).toBeNull()
    expect(data).toBeNull()
  })

  it('seller can select their own archived listing', async () => {
    const { client: sellerClient, user } = await signUpSeller('own-archived-read')
    createdUserIds.push(user.id)

    const { data: inserted, error: insertErr } = await sellerClient
      .from('listings')
      .insert(listingPayload(user.id, { status: 'archived' }))
      .select()
      .single()
    expect(insertErr).toBeNull()

    // Seller can read their own archived listing
    const { data, error } = await sellerClient
      .from('listings')
      .select('*')
      .eq('id', inserted!.id)
      .single()

    expect(error).toBeNull()
    expect(data!.id).toBe(inserted!.id)
    expect(data!.status).toBe('archived')
  })

  it("seller A cannot select seller B's archived listing", async () => {
    const { client: sellerAClient, user: userA } = await signUpSeller('a-cant-read-b-archived')
    const { client: sellerBClient, user: userB } = await signUpSeller('b-has-archived')
    createdUserIds.push(userA.id, userB.id)

    // Seller B creates an archived listing
    const { data: bListing, error: bInsertErr } = await sellerBClient
      .from('listings')
      .insert(listingPayload(userB.id, { status: 'archived' }))
      .select()
      .single()
    expect(bInsertErr).toBeNull()

    // Seller A tries to read it
    const { data, error } = await sellerAClient
      .from('listings')
      .select('*')
      .eq('id', bListing!.id)
      .maybeSingle()

    expect(error).toBeNull()
    expect(data).toBeNull() // Blocked by RLS
  })

  it('seller can update a listing status from published to archived', async () => {
    const { client: sellerClient, user } = await signUpSeller('status-update-archive')
    createdUserIds.push(user.id)

    // Create and publish a listing
    const { data: inserted } = await sellerClient
      .from('listings')
      .insert(listingPayload(user.id, { status: 'published' }))
      .select()
      .single()

    // Update status to archived
    const { data: updated, error } = await sellerClient
      .from('listings')
      .update({ status: 'archived' })
      .eq('id', inserted!.id)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updated!.status).toBe('archived')
  })

  it('seller can update a listing status from archived back to published', async () => {
    const { client: sellerClient, user } = await signUpSeller('status-update-republish')
    createdUserIds.push(user.id)

    // Create an archived listing
    const { data: inserted } = await sellerClient
      .from('listings')
      .insert(listingPayload(user.id, { status: 'archived' }))
      .select()
      .single()

    // Update status back to published
    const { data: updated, error } = await sellerClient
      .from('listings')
      .update({ status: 'published' })
      .eq('id', inserted!.id)
      .select()
      .single()

    expect(error).toBeNull()
    expect(updated!.status).toBe('published')
  })
})
