import { SupabaseClient, PostgrestError } from '@supabase/supabase-js'
import { Booking } from './types'

export interface VerifiedSlot {
  id: string
  listing_id: string
  listing_price_cents: number
  listing_title: string
  seller_id: string
  start_time: string
}

export async function verifySlotAvailability(
  supabase: SupabaseClient,
  listingId: string,
  slotId: string
): Promise<VerifiedSlot | null> {
  const { data, error } = await supabase
    .from('availability_slots')
    .select(`
      id,
      start_time,
      listing:listings!inner(
        id,
        title,
        price_cents,
        seller_id,
        status
      )
    `)
    .eq('id', slotId)
    .eq('listing_id', listingId)
    .eq('is_booked', false)
    .single()

  if (error || !data) return null

  const listing = Array.isArray(data.listing) ? data.listing[0] : data.listing

  if (!listing || listing.status !== 'published') return null

  return {
    id: data.id,
    listing_id: listing.id,
    listing_price_cents: listing.price_cents,
    listing_title: listing.title,
    seller_id: listing.seller_id,
    start_time: data.start_time,
  }
}

export async function createPendingBooking(
  supabase: SupabaseClient,
  booking: {
    listing_id: string
    buyer_id: string
    slot_id: string
    stripe_payment_intent_id: string
    amount_cents: number
  }
): Promise<{ data: Booking | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from('bookings')
    .insert({
      listing_id: booking.listing_id,
      buyer_id: booking.buyer_id,
      slot_id: booking.slot_id,
      status: 'pending',
      stripe_payment_intent_id: booking.stripe_payment_intent_id,
      amount_cents: booking.amount_cents,
    })
    .select()
    .single()

  return { data: data as Booking | null, error }
}
