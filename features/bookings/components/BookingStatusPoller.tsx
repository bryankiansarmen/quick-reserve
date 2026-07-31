'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface BookingStatusPollerProps {
  bookingId: string
}

const POLL_INTERVAL_MS = 4000
const MAX_POLLS = 15

/**
 * BookingStatusPoller: Client-side poller shown on the success page while the
 * booking is still `pending`. The webhook (standalone Express service) flips
 * the booking to `confirmed`; once it has, `router.refresh()` re-runs the
 * server component which then renders the confirmed state.
 *
 * Falls back to a "check again" action after MAX_POLLS so the user isn't left
 * in an infinite loop if the webhook is delayed.
 */
export function BookingStatusPoller({ bookingId }: BookingStatusPollerProps) {
  const router = useRouter()

  useEffect(() => {
    let pollCount = 0
    const interval = setInterval(() => {
      pollCount += 1
      if (pollCount > MAX_POLLS) {
        clearInterval(interval)
        return
      }
      router.refresh()
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [bookingId, router])

  return (
    <button
      type="button"
      onClick={() => router.refresh()}
      className="inline-block w-full px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
    >
      Check booking status
    </button>
  )
}
