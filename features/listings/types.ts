// Core domain types for availability slots

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
