import { SupabaseClient, PostgrestError } from '@supabase/supabase-js'
import { Booking, CheckoutBooking, BuyerBookingListItem, BuyerBookingsList, SellerBookingListItem, SellerBookingsList, SellerEarnings, SellerEarningsBooking } from './types'

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

/**
 * Fetch every booking belonging to the authenticated buyer.
 *
 * RLS policy "buyers read own bookings" enforces `buyer_id = auth.uid()`
 * automatically on the session-scoped client, so no explicit filter is
 * needed — a booking owned by another user simply never appears here.
 *
 * Items are split into `upcoming` (slot start in the future and status not
 * `cancelled`/`completed`) and `past` (everything else) after a single
 * round-trip, avoiding two queries to the same table.
 *
 * A query failure resolves to empty lists (with a logged error) so the page
 * renders its empty state rather than crashing on a transient DB hiccup.
 */
export async function getBuyerBookings(
  supabase: SupabaseClient,
): Promise<BuyerBookingsList> {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      id,
      status,
      amount_cents,
      created_at,
      slot:availability_slots(
        start_time,
        end_time
      ),
      listing:listings(
        id,
        title,
        location,
        images
      )
    `,
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getBuyerBookings] Error fetching buyer bookings:', {
      code: error.code,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { details: error.details }),
    })
    return { upcoming: [], past: [] }
  }

  const now = new Date()
  const upcoming: BuyerBookingListItem[] = []
  const past: BuyerBookingListItem[] = []

  for (const row of data || []) {
    const slot = Array.isArray(row.slot) ? row.slot[0] : row.slot
    const listing = Array.isArray(row.listing) ? row.listing[0] : row.listing
    if (!slot || !listing) continue

    const item: BuyerBookingListItem = {
      id: row.id,
      status: row.status,
      amount_cents: row.amount_cents,
      created_at: row.created_at,
      listing: {
        id: listing.id,
        title: listing.title,
        location: listing.location,
        image:
          Array.isArray(listing.images) && listing.images.length > 0
            ? listing.images[0]
            : null,
      },
      slot: {
        start_time: slot.start_time,
        end_time: slot.end_time,
      },
    }

    const slotInFuture = new Date(slot.start_time) >= now
    const isActive = row.status !== 'cancelled' && row.status !== 'completed'

    if (slotInFuture && isActive) {
      upcoming.push(item)
    } else {
      past.push(item)
    }
  }

  // Upcoming: soonest first; Past: most recently ended first.
  upcoming.sort(
    (a, b) => new Date(a.slot.start_time).getTime() - new Date(b.slot.start_time).getTime(),
  )
  past.sort(
    (a, b) => new Date(b.slot.start_time).getTime() - new Date(a.slot.start_time).getTime(),
  )

  return { upcoming, past }
}

/**
 * Fetch every booking across the authenticated seller's listings.
 *
 * RLS policy "sellers read bookings on own listings" enforces the scoping
 * automatically on the session-scoped client — bookings on listings the
 * caller does not own never appear here, so no explicit `seller_id` filter
 * is needed in app code.
 *
 * Items are split into `pending` (status `pending` — the accept/decline
 * queue) and `other` (every other status) after a single round-trip,
 * mirroring the buyer list's single-query contract.
 *
 * A query failure resolves to empty lists (with a logged error) so the page
 * renders its empty state rather than crashing on a transient DB hiccup.
 */
export async function getSellerBookings(
  supabase: SupabaseClient,
): Promise<SellerBookingsList> {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      id,
      status,
      amount_cents,
      created_at,
      slot:availability_slots(
        start_time,
        end_time
      ),
      listing:listings(
        id,
        title,
        location,
        images,
        booking_mode
      ),
      buyer:profiles(
        full_name
      )
    `,
    )
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getSellerBookings] Error fetching seller bookings:', {
      code: error.code,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { details: error.details }),
    })
    return { pending: [], other: [] }
  }

  const pending: SellerBookingListItem[] = []
  const other: SellerBookingListItem[] = []

  for (const row of data || []) {
    const slot = Array.isArray(row.slot) ? row.slot[0] : row.slot
    const listing = Array.isArray(row.listing) ? row.listing[0] : row.listing
    const buyer = Array.isArray(row.buyer) ? row.buyer[0] : row.buyer
    if (!slot || !listing || !buyer) continue

    const item: SellerBookingListItem = {
      id: row.id,
      status: row.status,
      amount_cents: row.amount_cents,
      created_at: row.created_at,
      booking_mode: listing.booking_mode,
      listing: {
        id: listing.id,
        title: listing.title,
        location: listing.location,
        image:
          Array.isArray(listing.images) && listing.images.length > 0
            ? listing.images[0]
            : null,
      },
      slot: {
        start_time: slot.start_time,
        end_time: slot.end_time,
      },
      buyer: {
        full_name: buyer.full_name,
      },
    }

    if (row.status === 'pending') {
      pending.push(item)
    } else {
      other.push(item)
    }
  }

  // Pending: oldest first (longest-waiting request needs attention first);
  // Other: most recently created first.
  pending.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  )
  other.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )

  return { pending, other }
}

/**
 * Fetch the earnings summary and history for the authenticated seller.
 *
 * Only `confirmed` and `completed` bookings count toward earnings (a
 * `pending` booking hasn't been paid, and a `cancelled` one never will be).
 * RLS policy "sellers read bookings on own listings" enforces the scoping
 * automatically on the session-scoped client — bookings on listings the
 * caller does not own never appear here, so no explicit `seller_id` filter
 * is needed in app code.
 *
 * The `total_cents` sum is computed over exactly the same rows shown in the
 * returned list, so the headline number and the history always agree.
 *
 * A query failure resolves to zero earnings (with a logged error) so the
 * page renders its empty state rather than crashing on a transient DB hiccup.
 */
export async function getSellerEarnings(
  supabase: SupabaseClient,
): Promise<SellerEarnings> {
  const { data, error } = await supabase
    .from('bookings')
    .select(
      `
      id,
      status,
      amount_cents,
      created_at,
      slot:availability_slots(
        start_time,
        end_time
      ),
      listing:listings(
        id,
        title,
        location,
        images
      ),
      buyer:profiles(
        full_name
      )
    `,
    )
    .in('status', ['confirmed', 'completed'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getSellerEarnings] Error fetching seller earnings:', {
      code: error.code,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && { details: error.details }),
    })
    return { total_cents: 0, bookings: [] }
  }

  const bookings: SellerEarningsBooking[] = []
  let total_cents = 0

  for (const row of data || []) {
    const slot = Array.isArray(row.slot) ? row.slot[0] : row.slot
    const listing = Array.isArray(row.listing) ? row.listing[0] : row.listing
    const buyer = Array.isArray(row.buyer) ? row.buyer[0] : row.buyer
    if (!slot || !listing || !buyer) continue

    total_cents += row.amount_cents

    bookings.push({
      id: row.id,
      status: row.status,
      amount_cents: row.amount_cents,
      created_at: row.created_at,
      listing: {
        id: listing.id,
        title: listing.title,
        location: listing.location,
        image:
          Array.isArray(listing.images) && listing.images.length > 0
            ? listing.images[0]
            : null,
      },
      slot: {
        start_time: slot.start_time,
        end_time: slot.end_time,
      },
      buyer: {
        full_name: buyer.full_name,
      },
    })
  }

  return { total_cents, bookings }
}
