import { z } from 'zod'

export const LISTING_CATEGORIES = [
  'photography-studio',
  'event-venue',
  'meeting-room',
  'activity-space',
] as const

export type ListingCategory = (typeof LISTING_CATEGORIES)[number]

export const BOOKING_MODES = ['instant', 'request'] as const
export const LISTING_STATUSES = ['draft', 'published', 'archived'] as const

/**
 * Zod schema for the create/edit listing form.
 * price_cents is derived from a dollars-and-cents string input on the client
 * (e.g. "85.00" → 8500). The server action converts it before inserting.
 */
export const listingSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must be 100 characters or fewer'),

  description: z
    .string()
    .max(2000, 'Description must be 2 000 characters or fewer')
    .optional(),

  category: z.enum(LISTING_CATEGORIES, {
    message: 'Please select a valid category',
  }),

  /**
   * price_cents: the raw integer stored in the DB.
   * Client sends a string like "85.00"; the action converts it.
   * We validate the final integer here.
   */
  price_cents: z
    .number({ message: 'Price must be a number' })
    .int('Price must be a whole number of cents')
    .positive('Price must be greater than 0'),

  location: z.string().min(1, 'Location is required'),

  booking_mode: z.enum(BOOKING_MODES, {
    message: 'Please select a booking mode',
  }),
})

export type ListingFormValues = z.infer<typeof listingSchema>

/**
 * Converts a dollar string from the form input (e.g. "85.00" or "85")
 * into an integer number of cents, or returns null if the input is invalid.
 */
export function dollarsToCents(value: string): number | null {
  const parsed = parseFloat(value)
  if (isNaN(parsed) || parsed < 0) return null
  return Math.round(parsed * 100)
}
