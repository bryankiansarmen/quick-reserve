import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateBookingSchema } from '@/features/bookings/validation'
import type {
  UpdateBookingAction,
  UpdateBookingErrorResponse,
} from '@/features/bookings/types'

/**
 * PATCH /api/bookings/[id]
 *
 * Seller accept/decline for request-to-book listings. Accept moves a
 * `pending` booking to `confirmed`; decline moves it to `cancelled`.
 *
 * Authorization is defense-in-depth: the route fetches the booking with the
 * session-scoped client, and the RLS policy "sellers update booking status on
 * own listings" independently blocks any write to a booking whose listing the
 * caller does not own — so even a caller who can read a booking (e.g. its own
 * buyer) cannot change its status.
 *
 * The `cancel` action is part of Task 4.4.1 and returns 400 until then.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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
            message: 'You must be signed in to update a booking.',
          } satisfies UpdateBookingErrorResponse,
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
          } satisfies UpdateBookingErrorResponse,
        },
        { status: 400 },
      )
    }

    const validation = updateBookingSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body.',
          } satisfies UpdateBookingErrorResponse,
        },
        { status: 400 },
      )
    }

    const { action } = validation.data as { action: UpdateBookingAction }

    if (action === 'cancel') {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_ACTION',
            message: 'Cancellation is not yet available.',
          } satisfies UpdateBookingErrorResponse,
        },
        { status: 400 },
      )
    }

    const { id } = await params

    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(
        `
        id,
        status,
        listing:listings(
          booking_mode
        )
      `,
      )
      .eq('id', id)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Booking not found.',
          } satisfies UpdateBookingErrorResponse,
        },
        { status: 404 },
      )
    }

    const listing = Array.isArray(booking.listing) ? booking.listing[0] : booking.listing

    const canAcceptOrDecline =
      booking.status === 'pending' &&
      listing?.booking_mode === 'request'

    if (!canAcceptOrDecline) {
      return NextResponse.json(
        {
          error: {
            code: 'INVALID_ACTION',
            message:
              'This booking can only be accepted or declined while it is pending on a request-to-book listing.',
          } satisfies UpdateBookingErrorResponse,
        },
        { status: 400 },
      )
    }

    const nextStatus = action === 'accept' ? 'confirmed' : 'cancelled'

    const { data: updated, error: updateError } = await supabase
      .from('bookings')
      .update({ status: nextStatus })
      .eq('id', id)
      .select('id, status')
      .single()

    if (updateError || !updated) {
      console.error('[PATCH /api/bookings/[id]] Failed to update booking:', {
        bookingId: id,
        action,
        error: updateError?.message,
        code: updateError?.code,
        timestamp: new Date().toISOString(),
      })

      // RLS "sellers update booking status on own listings" denies the write
      // for a caller who is not the listing's seller (e.g. the booking's own
      // buyer). Surface that as 403 rather than a misleading 500.
      if (updateError?.code === '42501') {
        return NextResponse.json(
          {
            error: {
              code: 'FORBIDDEN',
              message: 'Only the seller of this listing can accept or decline bookings.',
            } satisfies UpdateBookingErrorResponse,
          },
          { status: 403 },
        )
      }

      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An error occurred while updating the booking. Please try again.',
          } satisfies UpdateBookingErrorResponse,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({ data: updated }, { status: 200 })
  } catch (error) {
    console.error('[PATCH /api/bookings/[id]] Unexpected error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while updating the booking. Please try again.',
        } satisfies UpdateBookingErrorResponse,
      },
      { status: 500 },
    )
  }
}
