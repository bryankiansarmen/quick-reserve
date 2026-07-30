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

export interface CreateBookingRequest {
  listing_id: string
  slot_id: string
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
