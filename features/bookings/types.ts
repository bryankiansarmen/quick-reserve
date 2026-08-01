export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export interface Booking {
  id: string
  listing_id: string
  buyer_id: string
  slot_id: string
  status: BookingStatus
  stripe_payment_intent_id: string | null
  amount_cents: number
  created_at: string
  updated_at: string
}

export interface CreateBookingResponse {
  booking_id: string
  client_secret: string
}

export type BookingErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'SLOT_UNAVAILABLE'
  | 'INTERNAL_ERROR'

export interface BookingErrorResponse {
  code: BookingErrorCode
  message: string
}

export interface CheckoutBooking {
  booking: {
    id: string
    status: BookingStatus
    stripe_payment_intent_id: string | null
    amount_cents: number
    created_at: string
  }
  listing: {
    id: string
    title: string
    image: string | null
  }
  slot: {
    id: string
    start_time: string
    end_time: string
  }
  seller: {
    full_name: string
  }
}

export interface BuyerBookingListItem {
  id: string
  status: BookingStatus
  amount_cents: number
  created_at: string
  has_review: boolean
  can_cancel: boolean
  listing: {
    id: string
    title: string
    location: string
    image: string | null
  }
  slot: {
    start_time: string
    end_time: string
  }
}

export interface BuyerBookingsList {
  upcoming: BuyerBookingListItem[]
  past: BuyerBookingListItem[]
}

export interface SellerBookingListItem {
  id: string
  status: BookingStatus
  amount_cents: number
  created_at: string
  booking_mode: 'instant' | 'request'
  can_cancel: boolean
  listing: {
    id: string
    title: string
    location: string
    image: string | null
  }
  slot: {
    start_time: string
    end_time: string
  }
  buyer: {
    full_name: string
  }
}

export interface SellerBookingsList {
  pending: SellerBookingListItem[]
  other: SellerBookingListItem[]
}

export type SellerEarningBookingStatus = 'confirmed' | 'completed'

export interface SellerEarningsBooking {
  id: string
  status: SellerEarningBookingStatus
  amount_cents: number
  created_at: string
  listing: {
    id: string
    title: string
    location: string
    image: string | null
  }
  slot: {
    start_time: string
    end_time: string
  }
  buyer: {
    full_name: string
  }
}

export interface SellerEarnings {
  total_cents: number
  bookings: SellerEarningsBooking[]
}

export type UpdateBookingAction = 'accept' | 'decline' | 'cancel'

export type UpdateBookingErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INVALID_ACTION'
  | 'INTERNAL_ERROR'

export interface UpdateBookingErrorResponse {
  code: UpdateBookingErrorCode
  message: string
}
