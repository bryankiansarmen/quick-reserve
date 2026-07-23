import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

describe('Seller Opt-In: profiles.roles RLS tests', () => {
  it('allows a user to add seller to their own roles array', async () => {
    const email = `seller-optin-${Date.now()}@example.com`
    const password = 'Password123!'

    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    // Sign up creates profile with roles=['buyer']
    const { data: signUpData } = await client.auth.signUp({
      email,
      password,
      options: { data: { full_name: 'Opt-In Test User' } },
    })
    const userId = signUpData.user!.id

    // Verify initial state
    const { data: initial } = await client
      .from('profiles')
      .select('roles')
      .eq('id', userId)
      .single()
    expect(initial!.roles).toEqual(['buyer'])

    // Add seller role
    const { error: updateError } = await client
      .from('profiles')
      .update({ roles: ['buyer', 'seller'] })
      .eq('id', userId)

    expect(updateError).toBeNull()

    // Verify roles now contain both values
    const { data: updated } = await client
      .from('profiles')
      .select('roles')
      .eq('id', userId)
      .single()

    expect(updated!.roles).toContain('buyer')
    expect(updated!.roles).toContain('seller')
  })

  it('prevents User B from adding seller to User A roles', async () => {
    const userAEmail = `seller-rls-a-${Date.now()}@example.com`
    const userBEmail = `seller-rls-b-${Date.now()}@example.com`
    const password = 'Password123!'

    const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

    const { data: signUpA } = await clientA.auth.signUp({
      email: userAEmail,
      password,
      options: { data: { full_name: 'User A' } },
    })
    const userAId = signUpA.user!.id

    await clientB.auth.signUp({
      email: userBEmail,
      password,
      options: { data: { full_name: 'User B' } },
    })

    // User B attempts to update User A's roles
    const { data: result } = await clientB
      .from('profiles')
      .update({ roles: ['buyer', 'seller'] })
      .eq('id', userAId)
      .select()

    // RLS means 0 rows are updated — empty array, not an error
    expect(result).toEqual([])

    // Verify User A's roles are unchanged
    const { data: profileA } = await clientA
      .from('profiles')
      .select('roles')
      .eq('id', userAId)
      .single()

    expect(profileA!.roles).toEqual(['buyer'])
    expect(profileA!.roles).not.toContain('seller')
  })
})
