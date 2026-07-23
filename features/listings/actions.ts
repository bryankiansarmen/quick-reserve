'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { listingSchema, dollarsToCents } from './validation'

export type ListingActionState = {
  errors?: Partial<Record<string, string[]>>
  generalError?: string
  success?: boolean
}

/**
 * Parse and validate listing fields from FormData.
 * Returns a zod-validated object or throws a state with errors.
 */
function parseListingForm(formData: FormData): ReturnType<typeof listingSchema.safeParse> {
  const rawPriceDollars = formData.get('price_dollars') as string
  const price_cents = rawPriceDollars !== null ? dollarsToCents(rawPriceDollars) : null

  return listingSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    category: formData.get('category'),
    price_cents: price_cents ?? NaN,
    location: formData.get('location'),
    booking_mode: formData.get('booking_mode'),
  })
}

/**
 * Creates a new draft listing for the authenticated seller.
 * On success, redirects to /dashboard/listings.
 * On failure, returns field-level validation errors.
 */
export async function createListingAction(
  _prevState: ListingActionState | null,
  formData: FormData
): Promise<ListingActionState> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { generalError: 'You must be signed in to create a listing.' }
  }

  const result = parseListingForm(formData)

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const { error: insertError } = await supabase.from('listings').insert({
    seller_id: user.id,
    ...result.data,
    status: 'draft',
  })

  if (insertError) {
    return { generalError: insertError.message }
  }

  revalidatePath('/dashboard/listings')
  redirect('/dashboard/listings')
}

/**
 * Updates an existing listing owned by the authenticated seller.
 * The listing id is passed as a hidden form field "listing_id".
 */
export async function updateListingAction(
  _prevState: ListingActionState | null,
  formData: FormData
): Promise<ListingActionState> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { generalError: 'You must be signed in to update a listing.' }
  }

  const listingId = formData.get('listing_id') as string | null
  if (!listingId) {
    return { generalError: 'Missing listing ID.' }
  }

  const result = parseListingForm(formData)

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const { error: updateError } = await supabase
    .from('listings')
    .update(result.data)
    .eq('id', listingId)
    // RLS ensures only the owner can update; this .eq is an extra guard
    .eq('seller_id', user.id)

  if (updateError) {
    return { generalError: updateError.message }
  }

  revalidatePath('/dashboard/listings')
  revalidatePath(`/dashboard/listings/${listingId}/edit`)
  redirect('/dashboard/listings')
}
