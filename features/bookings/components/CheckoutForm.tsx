'use client'

import { useState } from 'react'
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'
import { formatPrice } from '@/lib/utils/currency'

interface CheckoutFormProps {
  bookingId: string
  amountCents: number
}

type PaymentState = {
  status: 'idle' | 'processing'
  error: string | null
}

/**
 * CheckoutForm: Stripe Elements payment form.
 *
 * Collects payment via the PaymentElement and confirms the Payment Intent
 * client-side. On success Stripe redirects to the configured return_url
 * (`/checkout/[bookingId]/success`); on failure a Stripe-specific message is
 * shown inline.
 *
 * Styling: Stripe's default appearance is used per product decision.
 */
export function CheckoutForm({ bookingId, amountCents }: CheckoutFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [state, setState] = useState<PaymentState>({ status: 'idle', error: null })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!stripe || !elements) {
      setState({ status: 'idle', error: 'Payment is still loading. Please try again.' })
      return
    }

    setState({ status: 'processing', error: null })

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/${bookingId}/success`,
      },
    })

    // If confirmPayment throws a non-redirect error, the error is returned here.
    // A successful payment redirects to return_url, so we only handle errors.
    if (error) {
      setState({ status: 'idle', error: formatStripeError(error) })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement
        options={{
          layout: 'tabs',
          paymentMethodOrder: ['card'],
        }}
      />

      {state.error && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-lg bg-danger/10 dark:bg-danger/20 border border-danger/30 px-4 py-3 text-sm text-danger"
        >
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={state.status === 'processing' || !stripe || !elements}
        className="w-full px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-busy={state.status === 'processing'}
      >
        {state.status === 'processing'
          ? 'Processing payment…'
          : `Pay ${formatPrice(amountCents)}`}
      </button>

      <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
        Payments are processed securely by Stripe. Your card details never touch our
        servers.
      </p>
    </form>
  )
}

/**
 * Map Stripe error types to human-friendly messages.
 */
function formatStripeError(error: { type?: string; code?: string; message?: string }): string {
  switch (error.code) {
    case 'card_declined':
      return 'Your card was declined. Please try a different payment method.'
    case 'insufficient_funds':
      return 'Your card has insufficient funds. Please use a different card.'
    case 'payment_intent_authentication_failure':
      return 'Card authentication failed. Please try again or use another card.'
    case 'expired_card':
      return 'Your card has expired. Please use a different card.'
    case 'processing_error':
      return 'An error occurred while processing your card. Please try again.'
    default:
      return (
        error.message ||
        'Payment failed. Please try again or use a different payment method.'
      )
  }
}
