export interface Review {
  id: string
  booking_id: string
  reviewer_id: string
  rating: number
  comment: string | null
  created_at: string
}

export type ReviewErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'BOOKING_NOT_COMPLETED'
  | 'REVIEW_ALREADY_EXISTS'
  | 'INTERNAL_ERROR'

export interface ReviewErrorResponse {
  code: ReviewErrorCode
  message: string
  details?: Record<string, string[]>
}

export interface CreateReviewResponse {
  data: Review
}
