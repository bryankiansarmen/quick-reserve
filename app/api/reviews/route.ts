import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createReviewSchema } from '@/features/reviews/validation'
import type {
  CreateReviewResponse,
  ReviewErrorResponse,
} from '@/features/reviews/types'

/**
 * POST /api/reviews
 *
 * Create a review for a completed booking.
 * A review can only be created for a booking with `status='completed'`, at most
 * one review per booking.
 *
 * Authorization is defense-in-depth: the booking is fetched with the
 * session-scoped client, so RLS ("buyers read own bookings") means a booking
 * belonging to another user resolves to 404 (no existence leak). The RLS
 * INSERT policy ("buyers review own completed bookings") independently
 * enforces reviewer=buyer-of-completed-booking on the write, and the unique
 * constraint on `reviews.booking_id` guarantees exactly-once.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          error: {
            code: 'UNAUTHENTICATED',
            message: 'You must be signed in to leave a review.',
          } satisfies ReviewErrorResponse,
        },
        { status: 401 },
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request body must be valid JSON.',
          } satisfies ReviewErrorResponse,
        },
        { status: 400 },
      )
    }

    const validation = createReviewSchema.safeParse(body)

    if (!validation.success) {
      const details: Record<string, string[]> = {}
      for (const issue of validation.error.issues) {
        const path = issue.path.join('.')
        if (!details[path]) details[path] = []
        details[path].push(issue.message)
      }

      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body.',
            details,
          } satisfies ReviewErrorResponse,
        },
        { status: 400 },
      )
    }

    const { booking_id, rating, comment } = validation.data

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, status, buyer_id')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Booking not found.',
          } satisfies ReviewErrorResponse,
        },
        { status: 404 },
      )
    }

    if (booking.status !== 'completed') {
      return NextResponse.json(
        {
          error: {
            code: 'BOOKING_NOT_COMPLETED',
            message: 'You can only review a booking after it has been completed.',
          } satisfies ReviewErrorResponse,
        },
        { status: 403 },
      )
    }

    const { data: review, error: insertError } = await supabase
      .from('reviews')
      .insert({
        booking_id,
        reviewer_id: user.id,
        rating,
        comment: comment?.trim() || null,
      })
      .select()
      .single()

    if (insertError || !review) {
      // Unique constraint on reviews.booking_id → a review already exists.
      if (insertError?.code === '23505') {
        return NextResponse.json(
          {
            error: {
              code: 'REVIEW_ALREADY_EXISTS',
              message: 'You have already reviewed this booking.',
            } satisfies ReviewErrorResponse,
          },
          { status: 409 },
        )
      }

      // RLS "buyers review own completed bookings" denied the write. The
      // pre-fetch gate normally catches this, but surface it as 403 rather
      // than a misleading 500 for any race (e.g. booking status changed).
      if (insertError?.code === '42501') {
        return NextResponse.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: 'You are not allowed to review this booking.',
            } satisfies ReviewErrorResponse,
          },
          { status: 403 },
        )
      }

      console.error('[POST /api/reviews] Failed to insert review:', {
        bookingId: booking_id,
        error: insertError?.message,
        code: insertError?.code,
        timestamp: new Date().toISOString(),
      })

      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An error occurred while submitting your review. Please try again.',
          } satisfies ReviewErrorResponse,
        },
        { status: 500 },
      )
    }

    const response: CreateReviewResponse = { data: review }
    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('[POST /api/reviews] Unexpected error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while submitting your review. Please try again.',
        } satisfies ReviewErrorResponse,
      },
      { status: 500 },
    )
  }
}
