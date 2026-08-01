'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { dollarsToCents } from '@/lib/utils/currency'
import { listingSchema, getPublishValidationErrors } from './validation'

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
  const rawImages = formData.getAll('images').filter((img): img is string => typeof img === 'string' && img.trim().length > 0)

  return listingSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description') || undefined,
    category: formData.get('category'),
    price_cents: price_cents ?? NaN,
    location: formData.get('location'),
    booking_mode: formData.get('booking_mode'),
    images: rawImages,
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

/**
 * Updates status of a listing (e.g. draft -> published -> archived).
 * Runs completeness validation when transitioning to published.
 */
export async function updateListingStatusAction(
  listingId: string,
  newStatus: 'draft' | 'published' | 'archived'
): Promise<ListingActionState> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { generalError: 'You must be signed in to update listing status.' }
  }

  // Fetch current listing details for ownership and completeness checks
  const { data: listing, error: fetchError } = await supabase
    .from('listings')
    .select('seller_id, images, status')
    .eq('id', listingId)
    .single()

  if (fetchError || !listing) {
    return { generalError: 'Listing not found.' }
  }

  if (listing.seller_id !== user.id) {
    return { generalError: "You don't have permission to update this listing." }
  }

  // Validate status transition requirements
  if (newStatus === 'published') {
    // Fetch slot count for validation
    const { count: slotsCount } = await supabase
      .from('availability_slots')
      .select('*', { count: 'exact', head: true })
      .eq('listing_id', listingId)
    
    const imagesCount = listing.images?.length || 0
    const validationErrors = getPublishValidationErrors(imagesCount, slotsCount || 0)
    if (validationErrors.length > 0) {
      return { 
        errors: { status: validationErrors },
        generalError: validationErrors.join('. ')
      }
    }
  }

  const { error: updateError } = await supabase
    .from('listings')
    .update({ status: newStatus })
    .eq('id', listingId)
    // Extra safety: make sure ownership is verified in DB query too
    .eq('seller_id', user.id)

  if (updateError) {
    return { generalError: updateError.message }
  }

  revalidatePath('/dashboard/listings')
  revalidatePath(`/dashboard/listings/${listingId}/edit`)
  revalidatePath('/dashboard')

  return { success: true }
}
