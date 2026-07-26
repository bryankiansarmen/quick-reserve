// Core domain types for listings and slots

export interface AvailabilitySlot {
  id: string
  listing_id: string
  start_time: string // ISO 8601 timestamptz (stored as UTC)
  end_time: string
  is_booked: boolean
  created_at: string
  updated_at: string
}

export interface SlotFormData {
  start_time: string
  end_time: string
}

export type SlotActionState = {
  errors?: {
    start_time?: string[]
    end_time?: string[]
    overlap?: string[]
    general?: string[]
  }
  success?: boolean
  conflictingSlot?: {
    start_time: string
    end_time: string
  }
}

// Search-related types (for GET /api/listings)

export interface ListingSearchParams {
  category?: string
  location?: string
  minPrice?: number // cents
  maxPrice?: number // cents
  date?: string // ISO date (YYYY-MM-DD)
  page?: number
  pageSize?: number
  sort?: 'price_asc' | 'price_desc' | 'rating_desc' | 'newest'
}

export interface ListingSearchResult {
  id: string
  title: string
  price_cents: number
  location: string
  images: string[]
  avg_rating: number // Placeholder 0 (bookings/reviews)
  review_count: number // Placeholder 0
}

export interface PaginatedListingsResponse {
  data: ListingSearchResult[]
  pagination: {
    page: number
    pageSize: number
    total: number
  }
}
