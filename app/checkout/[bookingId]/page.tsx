import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe/server'
import { getCheckoutBooking } from '@/features/bookings/queries'
import { CheckoutPageClient } from '@/features/bookings/components/CheckoutPageClient'
import { OrderSummary } from '@/features/bookings/components/OrderSummary'
import { BackButton } from '@/components/ui/BackButton'
import { Button } from '@/components/ui/Button'

export const dynamic = 'force-dynamic'

interface CheckoutPageProps {
  params: Promise<{ bookingId: string }>
}

export const metadata: Metadata = {
  title: 'Checkout | Quick Reserve',
  description: 'Complete your booking payment securely.',
  robots: { index: false, follow: false },
}

/**
 * Checkout Page (Stripe Elements)
 *
 * Flow:
 * 1. Require auth (redirect to login with a redirect-back param).
 * 2. Fetch the booking; RLS scopes reads to the owning buyer, so another
 *    user's booking id resolves to null → 404.
 * 3. Retrieve the Payment Intent server-side to obtain the client_secret
 *    (only the PI id is stored on the booking row).
 * 4. Gate on booking + PI state:
 *    - succeeded PI → redirect to the success page (webhook may lag).
 *    - cancelled PI / cancelled booking → show unavailable state.
 *    - otherwise render the Elements form + order summary.
 */
export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { bookingId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/checkout/${bookingId}`)}`)
  }

  const checkout = await getCheckoutBooking(supabase, bookingId)

  if (!checkout) {
    notFound()
  }

  const { booking, listing, slot, seller } = checkout

  if (booking.status === 'confirmed' || booking.status === 'completed') {
    redirect(`/checkout/${bookingId}/success`)
  }

  if (booking.status === 'cancelled') {
    return <UnavailableState />
  }

  if (!booking.stripe_payment_intent_id) {
    return <UnavailableState />
  }

  const stripe = getStripe()
  if (!stripe) {
    return <UnavailableState message="Payments are not configured. Please try again later." />
  }

  const paymentIntent = await stripe.paymentIntents.retrieve(
    booking.stripe_payment_intent_id,
  )

  if (paymentIntent.status === 'succeeded') {
    redirect(`/checkout/${bookingId}/success`)
  }

  if (paymentIntent.status === 'canceled') {
    return (
      <UnavailableState message="This booking was cancelled before payment was completed. Please try booking again." />
    )
  }

  if (!paymentIntent.client_secret) {
    return <UnavailableState message="This booking is not ready for payment. Please try again." />
  }

  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton
          label="Back to Listing"
          fallbackHref={`/listings/${listing.id}`}
          confirmMessage="Are you sure you want to leave checkout? Your booking will not be completed."
          confirmTitle="Leave checkout?"
        />
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50 mb-8 mt-6">
          Complete your booking
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment form (2 cols on lg) */}
          <div className="lg:col-span-2">
            <CheckoutPageClient
              clientSecret={paymentIntent.client_secret}
              bookingId={booking.id}
              amountCents={booking.amount_cents}
            />
          </div>

          {/* Order summary (1 col on lg, sticky) */}
          <div className="lg:col-span-1">
            <OrderSummary
              listing={listing}
              slot={slot}
              seller={seller}
              amountCents={booking.amount_cents}
            />
          </div>
        </div>
      </div>
    </main>
  )
}

function UnavailableState({
  message = 'This booking is no longer available. Please try booking again.',
}: {
  message?: string
}) {
  return (
    <main className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md text-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-4">
          Booking unavailable
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mb-6">{message}</p>
        <Button asChild href="/search">
          Browse listings
        </Button>
      </div>
    </main>
  )
}
