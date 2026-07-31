import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSellerBookings } from '@/features/bookings/queries'
import type { SellerBookingsList } from '@/features/bookings/types'

export type SellerBookingsErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'INTERNAL_ERROR'

interface SellerBookingsErrorResponse {
  code: SellerBookingsErrorCode
  message: string
}

/**
 * GET /api/seller/bookings
 *
 * Returns the authenticated seller's incoming bookings across all their
 * listings, split into `pending` (actionable) and `other` (history).
 *
 * The `bookings` RLS policy "sellers read bookings on own listings" scopes
 * the query — a non-seller or a seller with no matching listings gets empty
 * lists, never another seller's data.
 */
export async function GET() {
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
            message: 'You must be signed in to view seller bookings.',
          } satisfies SellerBookingsErrorResponse,
        },
        { status: 401 },
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .single()

    if (!profile?.roles?.includes('seller')) {
      return NextResponse.json(
        {
          error: {
            code: 'FORBIDDEN',
            message: 'Your account is not a seller.',
          } satisfies SellerBookingsErrorResponse,
        },
        { status: 403 },
      )
    }

    const bookings: SellerBookingsList = await getSellerBookings(supabase)

    return NextResponse.json({ data: bookings }, { status: 200 })
  } catch (error) {
    console.error('[GET /api/seller/bookings] Unexpected error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An error occurred while fetching seller bookings.',
        } satisfies SellerBookingsErrorResponse,
      },
      { status: 500 },
    )
  }
}
