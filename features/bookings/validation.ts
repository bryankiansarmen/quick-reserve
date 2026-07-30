import { z } from 'zod'

export const createBookingSchema = z.object({
  listing_id: z.string().uuid('listing_id must be a valid UUID'),
  slot_id: z.string().uuid('slot_id must be a valid UUID'),
})

export type CreateBookingInput = z.infer<typeof createBookingSchema>
