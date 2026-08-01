'use client'

import { Elements } from '@stripe/react-stripe-js'
import { getStripePromise } from '@/lib/stripe/client'
import { CheckoutForm } from './CheckoutForm'

interface CheckoutPageClientProps {
  clientSecret: string
  bookingId: string
  amountCents: number
}

/**
 * CheckoutPageClient: Wraps the Stripe Elements payment form with the
 * Elements provider bound to this booking's Payment Intent.
 *
 * The page component (server) passes the client_secret; Stripe.js is loaded
 * lazily client-side via getStripePromise(). Default Stripe appearance is used.
 */
export function CheckoutPageClient({
  clientSecret,
  bookingId,
  amountCents,
}: CheckoutPageClientProps) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-6">
        Payment details
      </h2>
      <Elements
        stripe={getStripePromise()}
        options={{ clientSecret, appearance: { theme: 'stripe' }, loader: 'auto' }}
      >
        <CheckoutForm bookingId={bookingId} amountCents={amountCents} />
      </Elements>
    </div>
  )
}
