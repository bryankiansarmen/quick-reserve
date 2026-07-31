import { SupabaseClient, PostgrestError } from '@supabase/supabase-js'
import { Booking, CheckoutBooking } from './types'

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

/**
 * Fetch the checkout details for a booking owned by the current user.
 *
 * RLS enforces that a buyer can only read their own bookings, so a booking
 * belonging to another user resolves to null (clean 404 rather than a leak).
 *
 * The result is denormalized into a flat CheckoutBooking shape for the
 * checkout page (order summary + payment intent binding).
 */
export async function getCheckoutBooking(
  supabase: SupabaseClient,
  bookingId: string,
): Promise<CheckoutBooking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      id,
      status,
      stripe_payment_intent_id,
      amount_cents,
      created_at,
      slot:availability_slots(
        id,
        start_time,
        end_time
      ),
      listing:listings(
        id,
        title,
        images,
        seller:profiles(
          full_name
        )
      )
    `,
    )
    .eq('id', bookingId)
    .single()

  if (error || !data) return null

  const slot = Array.isArray(data.slot) ? data.slot[0] : data.slot
  const listing = Array.isArray(data.listing) ? data.listing[0] : data.listing
  const seller = Array.isArray(listing?.seller) ? listing.seller[0] : listing?.seller

  if (!slot || !listing || !seller) return null

  return {
    booking: {
      id: data.id,
      status: data.status,
      stripe_payment_intent_id: data.stripe_payment_intent_id,
      amount_cents: data.amount_cents,
      created_at: data.created_at,
    },
    listing: {
      id: listing.id,
      title: listing.title,
      image: Array.isArray(listing.images) && listing.images.length > 0
        ? listing.images[0]
        : null,
    },
    slot: {
      id: slot.id,
      start_time: slot.start_time,
      end_time: slot.end_time,
    },
    seller: {
      full_name: seller.full_name,
    },
  }
}
