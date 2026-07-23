'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/**
 * Appends 'seller' to the current user's roles array.
 * RLS ensures this can only touch the authenticated user's own row.
 */
export async function becomeSellerAction(): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'You must be signed in to perform this action.' }
  }

  // Fetch current roles to avoid duplicating 'seller'
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .single()

  if (fetchError || !profile) {
    return { error: 'Could not load your profile. Please try again.' }
  }

  if (profile.roles.includes('seller')) {
    return { success: true } // Already a seller — idempotent
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ roles: [...profile.roles, 'seller'] })
    .eq('id', user.id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}
