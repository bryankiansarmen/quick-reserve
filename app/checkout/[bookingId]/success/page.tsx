import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCheckoutBooking } from '@/features/bookings/queries'
import { BookingStatusPoller } from '@/features/bookings/components/BookingStatusPoller'
import { Button } from '@/components/ui/Button'

export const dynamic = 'force-dynamic'

interface SuccessPageProps {
  params: Promise<{ bookingId: string }>
}

export const metadata: Metadata = {
  title: 'Booking Confirmed | Quick Reserve',
  description: 'Your booking was successful.',
  robots: { index: false, follow: false },
}

/**
 * Success page: shown after Stripe redirects the browser following a
 * successful payment.
 *
 * Booking state at this point depends on webhook timing:
 * - `confirmed`/`completed`: the webhook already finalized the booking.
 * - `pending`: the webhook hasn't fired yet — a client poller refreshes this
 *   page until the booking is confirmed.
 * - `cancelled`: an edge case (booking was cancelled while paying).
 */
export default async function SuccessPage({ params }: SuccessPageProps) {
  const { bookingId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/checkout/${bookingId}/success`)}`)
  }

  const checkout = await getCheckoutBooking(supabase, bookingId)

  if (!checkout) {
    notFound()
  }

  if (checkout.booking.status === 'cancelled') {
    return (
      <StatusCard
        title="Booking cancelled"
        body="This booking was cancelled before payment could be finalized."
      />
    )
  }

  const isConfirmed =
    checkout.booking.status === 'confirmed' || checkout.booking.status === 'completed'

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        {isConfirmed ? (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-success"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">
              Booking confirmed!
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              You&apos;ll receive a confirmation email shortly.
            </p>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 mb-6">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Booking reference
              </p>
              <p className="font-mono font-semibold text-slate-900 dark:text-slate-50 mt-1">
                {checkout.booking.id.slice(0, 8)}
              </p>
            </div>

            <div className="space-y-3">
              <Button asChild size="lg" fullWidth href="/dashboard/bookings">
                View My Bookings
              </Button>
              <Button asChild variant="secondary" size="lg" fullWidth href="/search">
                Browse More Spaces
              </Button>
              <Button asChild variant="ghost" size="lg" fullWidth href={`/listings/${checkout.listing.id}`}>
                Back to Listing
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-warning/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-warning animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
              Payment received
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              We&apos;re finalizing your booking. This usually takes just a moment…
            </p>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 mb-6">
              <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Booking reference
              </p>
              <p className="font-mono font-semibold text-slate-900 dark:text-slate-50 mt-1">
                {checkout.booking.id.slice(0, 8)}
              </p>
            </div>

            <BookingStatusPoller bookingId={checkout.booking.id} />
          </div>
        )}
      </div>
    </main>
  )
}

function StatusCard({ title, body }: { title: string; body: string }) {
  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-4">
          {title}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">{body}</p>
        <Button asChild size="lg" fullWidth href="/search">
          Browse listings
        </Button>
      </div>
    </main>
  )
}
