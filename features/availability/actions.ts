'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { slotSchema } from '@/features/listings/validation'
import type { SlotActionState, AvailabilitySlot } from '@/features/listings/types'

export async function addSlotAction(
  _prevState: SlotActionState | null,
  formData: FormData
): Promise<SlotActionState> {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { errors: { general: ['You must be signed in to add slots.'] } }
  }

  const listingId = formData.get('listing_id') as string
  if (!listingId) {
    return { errors: { general: ['Missing listing ID.'] } }
  }

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('seller_id')
    .eq('id', listingId)
    .single()

  if (listingError || !listing) {
    return { errors: { general: ['Listing not found.'] } }
  }

  if (listing.seller_id !== user.id) {
    return { errors: { general: ['You do not have permission to add slots to this listing.'] } }
  }

  const startTimeInput = formData.get('start_time') as string
  const endTimeInput = formData.get('end_time') as string

  const normalizeDateTime = (dt: string): string => {
    if (!dt) return dt
    try {
      const dateObj = new Date(dt)
      return dateObj.toISOString()
    } catch {
      if (!dt.includes(':00Z') && !dt.includes('+')) {
        return `${dt}:00Z`
      }
      return dt
    }
  }

  const result = slotSchema.safeParse({
    start_time: normalizeDateTime(startTimeInput),
    end_time: normalizeDateTime(endTimeInput),
  })

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const { error: insertError } = await supabase
    .from('availability_slots')
    .insert({
      listing_id: listingId,
      start_time: result.data.start_time,
      end_time: result.data.end_time,
    })

  if (insertError) {
    if (insertError.code === '23505' && insertError.message.includes('no_overlapping_slots')) {
      const { data: conflicting } = await supabase
        .from('availability_slots')
        .select('start_time, end_time')
        .eq('listing_id', listingId)
        .filter('start_time', 'lt', result.data.end_time)
        .filter('end_time', 'gt', result.data.start_time)
        .order('start_time', { ascending: true })
        .limit(1)
        .single()

      return {
        errors: {
          overlap: ['This time slot overlaps with an existing availability window']
        },
        conflictingSlot: conflicting || undefined
      }
    }

    return { errors: { general: [insertError.message] } }
  }

  revalidatePath('/dashboard/listings')
  revalidatePath(`/dashboard/listings/${listingId}/slots`)

  return { success: true }
}

export async function deleteSlotAction(
  listingId: string,
  slotId: string
): Promise<SlotActionState> {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { errors: { general: ['You must be signed in to delete slots.'] } }
  }

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('seller_id')
    .eq('id', listingId)
    .single()

  if (listingError || !listing) {
    return { errors: { general: ['Listing not found.'] } }
  }

  if (listing.seller_id !== user.id) {
    return { errors: { general: ['You do not have permission to delete slots from this listing.'] } }
  }

  const { data: slot, error: slotError } = await supabase
    .from('availability_slots')
    .select('is_booked')
    .eq('id', slotId)
    .eq('listing_id', listingId)
    .single()

  if (slotError || !slot) {
    return { errors: { general: ['Slot not found.'] } }
  }

  if (slot.is_booked) {
    return {
      errors: {
        general: ['Cannot delete this slot because it has an active booking.']
      }
    }
  }

  const { error: deleteError } = await supabase
    .from('availability_slots')
    .delete()
    .eq('id', slotId)
    .eq('listing_id', listingId)

  if (deleteError) {
    return { errors: { general: [deleteError.message] } }
  }

  revalidatePath('/dashboard/listings')
  revalidatePath(`/dashboard/listings/${listingId}/slots`)

  return { success: true }
}

export async function fetchSlots(listingId: string): Promise<AvailabilitySlot[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('availability_slots')
    .select('*')
    .eq('listing_id', listingId)
    .order('start_time', { ascending: true })

  if (error) {
    console.error('Error fetching slots:', error)
    return []
  }

  return data || []
}
