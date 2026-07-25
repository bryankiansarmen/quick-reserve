import { describe, it, expect } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

describe('Profiles Table & Signup Trigger Integration Tests', () => {
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  it('automatically creates a profile record with roles={buyer} when a user signs up', async () => {
    const email = `test-profile-trigger-${Date.now()}@example.com`
    const password = 'Password123!'
    const fullName = 'Trigger Test User'

    const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    expect(signUpError).toBeNull()
    expect(signUpData.user).not.toBeNull()

    const userId = signUpData.user!.id

    // Query profiles table for the created profile
    const { data: profile, error: profileError } = await anonClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    expect(profileError).toBeNull()
    expect(profile).not.toBeNull()
    expect(profile.id).toBe(userId)
    expect(profile.full_name).toBe(fullName)
    expect(profile.roles).toEqual(['buyer'])
  })

  it('allows public read of profiles but restricts profile updates to row owner', async () => {
    const userAEmail = `usera-${Date.now()}@example.com`
    const userBEmail = `userb-${Date.now()}@example.com`
    const password = 'Password123!'

    // Create User A
    const clientA = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    const { data: userAData } = await clientA.auth.signUp({
      email: userAEmail,
      password,
      options: { data: { full_name: 'User A' } },
    })
    const userAId = userAData.user!.id

    // Create User B
    const clientB = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    await clientB.auth.signUp({
      email: userBEmail,
      password,
      options: { data: { full_name: 'User B' } },
    })

    // Any client can read User A's profile
    const { data: profileA, error: readError } = await anonClient
      .from('profiles')
      .select('*')
      .eq('id', userAId)
      .single()

    expect(readError).toBeNull()
    expect(profileA.full_name).toBe('User A')

    // User A can update their own profile
    const { error: updateOwnError } = await clientA
      .from('profiles')
      .update({ bio: 'Updated bio for User A' })
      .eq('id', userAId)

    expect(updateOwnError).toBeNull()

    const { data: updatedProfileA } = await anonClient
      .from('profiles')
      .select('bio')
      .eq('id', userAId)
      .single()

    expect(updatedProfileA.bio).toBe('Updated bio for User A')

    // User B attempting to update User A's profile affects 0 rows due to RLS
    const { data: userBUpdateResult } = await clientB
      .from('profiles')
      .update({ bio: 'Hacked by User B' })
      .eq('id', userAId)
      .select()

    expect(userBUpdateResult).toEqual([]) // 0 rows updated

    // Verify User A's bio was NOT changed by User B
    const { data: unchangedProfileA } = await anonClient
      .from('profiles')
      .select('bio')
      .eq('id', userAId)
      .single()

    expect(unchangedProfileA.bio).toBe('Updated bio for User A')
  })
})
