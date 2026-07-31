export interface Review {
  id: string
  booking_id: string
  reviewer_id: string
  rating: number
  comment: string | null
  created_at: string
}

export interface CreateReviewRequest {
  booking_id: string
  rating: number
  comment?: string
}
