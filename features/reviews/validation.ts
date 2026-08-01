import { z } from 'zod'

export const MAX_REVIEW_COMMENT_LENGTH = 1000

export const createReviewSchema = z.object({
  booking_id: z.string().uuid('booking_id must be a valid UUID'),
  rating: z
    .number()
    .int('rating must be a whole number')
    .min(1, 'rating must be between 1 and 5')
    .max(5, 'rating must be between 1 and 5'),
  comment: z
    .string()
    .max(MAX_REVIEW_COMMENT_LENGTH, `comment must be ${MAX_REVIEW_COMMENT_LENGTH} characters or fewer`)
    .optional(),
})
