import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/server'
import { updateBookingSchema } from '@/features/bookings/validation'
import { notifyBookingCancelled } from '@/features/bookings/notifications'
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
 * The `cancel` action lets the booking's buyer OR the listing's
 * seller cancel a `pending` or `confirmed` booking before the slot starts. It
 * delegates the guarded, atomic state change to the `cancel_booking()` DB
 * function (status -> 'cancelled' + slot released in one transaction), then
 * runs best-effort downstream work that must never fail the request: cancels
 * the Stripe Payment Intent for `pending` bookings, defers refunds for
 * `confirmed` ones (beyond MVP), and notifies the webhook service to email
 * both parties.
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
      return handleCancellation(supabase, await params)
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

interface CancelBookingResult {
  previous_status: 'pending' | 'confirmed'
  stripe_payment_intent_id: string | null
  cancelled_by: 'buyer' | 'seller'
}

function errorResponse(
  code: UpdateBookingErrorResponse['code'],
  message: string,
  status: number,
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      } satisfies UpdateBookingErrorResponse,
    },
    { status },
  )
}

/**
 * Cancel a booking by delegating the guarded, atomic transition to the
 * `cancel_booking()` SECURITY DEFINER function. The function enforces
 * authorization (buyer or listing seller) and the business rules (pending/
 * confirmed only, slot not started) inside a single transaction that also
 * releases the slot — RLS alone cannot express this atomically for a Buyer,
 * who has no UPDATE grant on availability_slots.
 *
 * Custom SQLSTATEs raised by the function are mapped to HTTP responses.
 */
async function handleCancellation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: { id: string },
): Promise<NextResponse> {
  const { id } = params

  const { data, error } = await supabase.rpc('cancel_booking', {
    p_booking_id: id,
  })

  if (error || !data) {
    console.error('[PATCH /api/bookings/[id]] Cancel failed:', {
      bookingId: id,
      code: error?.code,
      message: error?.message,
      timestamp: new Date().toISOString(),
    })

    switch (error?.code) {
      case 'BKC01':
        return errorResponse(
          'UNAUTHENTICATED',
          'You must be signed in to cancel a booking.',
          401,
        )
      case 'BKC02':
        return errorResponse('NOT_FOUND', 'Booking not found.', 404)
      case 'BKC03':
        return errorResponse(
          'FORBIDDEN',
          'Only the buyer or the listing owner can cancel this booking.',
          403,
        )
      case 'BKC04':
        return errorResponse(
          'INVALID_ACTION',
          'This booking can no longer be cancelled.',
          400,
        )
      case 'BKC05':
        return errorResponse(
          'INVALID_ACTION',
          'This booking can no longer be cancelled because the slot has already started.',
          400,
        )
      default:
        return errorResponse(
          'INTERNAL_ERROR',
          'An error occurred while cancelling the booking. Please try again.',
          500,
        )
    }
  }

  const result = data as CancelBookingResult

  if (result.previous_status === 'pending') {
    await cancelStripePaymentIntent(id, result.stripe_payment_intent_id)
  } else {
    // No refunds at MVP: a captured payment for a
    // `confirmed` booking is left as-is and the slot is released.
    console.warn(
      '[PATCH /api/bookings/[id]] Confirmed booking cancelled — automatic refunds are deferred beyond the MVP.',
      { bookingId: id },
    )
  }

  // Best-effort: the webhook service emails both parties. Never blocks the
  // cancellation if the service is down or unconfigured.
  await notifyBookingCancelled(id, result.cancelled_by)

  return NextResponse.json({ data: { id, status: 'cancelled' } }, { status: 200 })
}

/**
 * Best-effort Stripe Payment Intent cancellation for a `pending` booking whose
 * intent was created but never confirmed. Failures are logged, never thrown —
 * the DB transition has already committed and must not be rolled back.
 */
async function cancelStripePaymentIntent(
  bookingId: string,
  paymentIntentId: string | null,
): Promise<void> {
  if (!paymentIntentId) return

  const stripe = getStripe()
  if (!stripe) {
    console.warn(
      '[PATCH /api/bookings/[id]] Stripe not configured — skipping Payment Intent cancellation.',
      { bookingId },
    )
    return
  }

  try {
    await stripe.paymentIntents.cancel(paymentIntentId)
    console.log('[PATCH /api/bookings/[id]] Cancelled Stripe Payment Intent.', {
      bookingId,
      paymentIntentId,
    })
  } catch (error) {
    console.error(
      '[PATCH /api/bookings/[id]] Failed to cancel Stripe Payment Intent (non-fatal):',
      {
        bookingId,
        paymentIntentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    )
  }
}
