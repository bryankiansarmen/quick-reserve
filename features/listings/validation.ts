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

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
] as const

export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return {
      valid: false,
      error: 'File type is not supported. Please upload an image (JPG, PNG, WebP, GIF, or AVIF).',
    }
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'File size exceeds the 5MB limit.',
    }
  }
  return { valid: true }
}

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

  images: z
    .array(z.string().url('Invalid image URL'))
    .max(10, 'You can upload up to 10 images')
    .default([]),
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

export const PUBLISH_REQUIREMENTS = {
  MIN_IMAGES: 1,
  MIN_SLOTS: 1,
} as const

/**
 * Validates whether a listing can be published based on completeness rules.
 * Checks that the listing has at least 1 image and 1 availability slot.
 */
export function getPublishValidationErrors(imagesCount: number, slotsCount: number): string[] {
  const errors: string[] = []
  if (imagesCount < PUBLISH_REQUIREMENTS.MIN_IMAGES) {
    errors.push('Add at least 1 image before publishing')
  }
  if (slotsCount < PUBLISH_REQUIREMENTS.MIN_SLOTS) {
    errors.push('Add at least 1 availability slot before publishing')
  }
  return errors
}

export const MIN_SLOT_DURATION_MINUTES = 15
export const MAX_SLOT_DURATION_HOURS = 24

/**
 * Zod schema for slot validation.
 * Ensures:
 * - Valid ISO 8601 datetime strings
 * - End time is after start time
 * - Start time is in the future
 * - Duration is between 15 minutes and 24 hours
 */
export const slotSchema = z.object({
  start_time: z.string()
    .datetime('Invalid start time format'),
  end_time: z.string()
    .datetime('Invalid end time format'),
})
.refine(
  (data) => new Date(data.end_time) > new Date(data.start_time),
  { message: 'End time must be after start time', path: ['end_time'] }
)
.refine(
  (data) => new Date(data.start_time) > new Date(),
  { message: 'Start time must be in the future', path: ['start_time'] }
)
.refine(
  (data) => {
    const duration = new Date(data.end_time).getTime() - new Date(data.start_time).getTime()
    const minutes = duration / (1000 * 60)
    return minutes >= MIN_SLOT_DURATION_MINUTES
  },
  { message: `Slot must be at least ${MIN_SLOT_DURATION_MINUTES} minutes`, path: ['end_time'] }
)
.refine(
  (data) => {
    const duration = new Date(data.end_time).getTime() - new Date(data.start_time).getTime()
    const hours = duration / (1000 * 60 * 60)
    return hours <= MAX_SLOT_DURATION_HOURS
  },
  { message: `Slot cannot exceed ${MAX_SLOT_DURATION_HOURS} hours`, path: ['end_time'] }
)

/**
 * Formats slot duration as human-readable string.
 * Examples: "2h 30m", "1h", "45m"
 */
export function formatDuration(startTime: string, endTime: string): string {
  const ms = new Date(endTime).getTime() - new Date(startTime).getTime()
  const hours = Math.floor(ms / (1000 * 60 * 60))
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
  
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

/**
 * Formats time range for display using browser locale.
 * Examples:
 *   US: "Mon, Jan 15, 2026 • 2:00 PM – 4:00 PM"
 *   UK: "Mon, 15 Jan 2026 • 14:00 – 16:00"
 * Uses undefined locale to respect browser's locale preference.
 */
export function formatTimeRange(startTime: string, endTime: string): string {
  const start = new Date(startTime)
  const end = new Date(endTime)
  
  const dateFormatter = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true, // Adapts to locale (becomes 24h where appropriate)
  })
  
  return `${dateFormatter.format(start)} • ${timeFormatter.format(start)} – ${timeFormatter.format(end)}`
}

