'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { UpdateBookingAction } from '../types'

interface AcceptDeclineActionsProps {
  bookingId: string
}

/**
 * AcceptDeclineActions: the interactive accept/decline controls for a pending
 * request-mode booking.
 *
 * Thin client island embedded in the server-rendered SellerBookingCard.
 * Calls the PATCH /api/bookings/[id] endpoint, then refreshes the route so
 * the server components re-render with the updated booking status.
 */
export function AcceptDeclineActions({ bookingId }: AcceptDeclineActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleAction = (action: UpdateBookingAction) => {
    setErrorMessage(null)
    startTransition(async () => {
      try {
        const response = await fetch(`/api/bookings/${bookingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        })

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: { message?: string } }
            | null
          setErrorMessage(
            body?.error?.message ?? 'Something went wrong. Please try again.',
          )
          return
        }

        router.refresh()
      } catch {
        setErrorMessage('Something went wrong. Please try again.')
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleAction('accept')}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
          aria-busy={isPending}
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => handleAction('decline')}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-950/20 transition-colors"
          aria-busy={isPending}
        >
          Decline
        </button>
      </div>
      {errorMessage && (
        <span
          role="alert"
          aria-live="polite"
          className="text-xs font-medium text-red-600 dark:text-red-400 max-w-[220px] text-right"
        >
          {errorMessage}
        </span>
      )}
    </div>
  )
}
