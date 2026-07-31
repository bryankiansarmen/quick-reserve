import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/server'
import { createBookingSchema } from '@/features/bookings/validation'
import {
  verifySlotAvailability,
  createPendingBooking,
} from '@/features/bookings/queries'
import type { CreateBookingResponse, BookingErrorResponse } from '@/features/bookings/types'

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
            message: 'You must be signed in to create a booking.',
          } satisfies BookingErrorResponse,
        },
        { status: 401 },
      )
    }

    const stripe = getStripe()
    if (!stripe) {
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Payments are not configured. Please try again later.',
          } satisfies BookingErrorResponse,
        },
        { status: 500 },
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
          } satisfies BookingErrorResponse,
        },
        { status: 400 },
      )
    }

    const validation = createBookingSchema.safeParse(body)

    if (!validation.success) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of validation.error.issues) {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) fieldErrors[path] = []
        fieldErrors[path].push(issue.message)
      }

      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body.',
            details: fieldErrors,
          } satisfies BookingErrorResponse & { details: Record<string, string[]> },
        },
        { status: 400 },
      )
    }

    const { listing_id, slot_id } = validation.data

    const slot = await verifySlotAvailability(supabase, listing_id, slot_id)

    if (!slot) {
      return NextResponse.json(
        {
          error: {
            code: 'SLOT_UNAVAILABLE',
            message:
              'This slot is no longer available. It may have been booked or the listing is no longer published.',
          } satisfies BookingErrorResponse,
        },
        { status: 409 },
      )
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: slot.listing_price_cents,
      currency: 'usd',
      metadata: {
        listing_id,
        slot_id,
        buyer_id: user.id,
        seller_id: slot.seller_id,
        listing_title: slot.listing_title,
        slot_start_time: slot.start_time,
        amount_cents: String(slot.listing_price_cents),
      },
      automatic_payment_methods: { enabled: true },
    })

    const { data: booking, error: bookingError } = await createPendingBooking(
      supabase,
      {
        listing_id,
        buyer_id: user.id,
        slot_id,
        stripe_payment_intent_id: paymentIntent.id,
        amount_cents: slot.listing_price_cents,
      },
    )

    if (bookingError) {
      if (paymentIntent.id) {
        await stripe.paymentIntents
          .cancel(paymentIntent.id)
          .catch((cancelErr: unknown) => {
            console.error(
              '[POST /api/bookings] Failed to cancel orphaned Payment Intent:',
              cancelErr,
            )
          })
      }

      if (bookingError.code === '23505') {
        return NextResponse.json(
          {
            error: {
              code: 'SLOT_UNAVAILABLE',
              message:
                'This slot was just booked by another user. Please choose a different time slot.',
            } satisfies BookingErrorResponse,
          },
          { status: 409 },
        )
      }

      console.error('[POST /api/bookings] Unexpected DB error:', {
        error: bookingError.message,
        code: bookingError.code,
        timestamp: new Date().toISOString(),
      })

      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message:
              'An error occurred while creating your booking. Please try again.',
          } satisfies BookingErrorResponse,
        },
        { status: 500 },
      )
    }

    if (!booking) {
      console.error('[POST /api/bookings] Booking creation returned null without error')
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message:
              'An error occurred while creating your booking. Please try again.',
          } satisfies BookingErrorResponse,
        },
        { status: 500 },
      )
    }

    const response: CreateBookingResponse = {
      booking_id: booking.id,
      client_secret: paymentIntent.client_secret!,
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('[POST /api/bookings] Unexpected error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message:
            'An error occurred while creating your booking. Please try again.',
        } satisfies BookingErrorResponse,
      },
      { status: 500 },
    )
  }
}
