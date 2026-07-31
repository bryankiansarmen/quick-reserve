import { loadStripe, type Stripe } from '@stripe/stripe-js'

let stripePromise: Promise<Stripe | null> | null = null

/**
 * Lazily load the Stripe.js client with a singleton promise.
 * Only the publishable key is exposed to the client (never the secret key).
 */
export function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (!key) {
      console.error(
        '[getStripePromise] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not configured',
      )
      return Promise.resolve(null)
    }
    stripePromise = loadStripe(key)
  }
  return stripePromise
}
