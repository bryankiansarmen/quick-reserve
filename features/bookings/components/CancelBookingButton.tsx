'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

interface CancelBookingButtonProps {
  bookingId: string
}

/**
 * CancelBookingButton: the interactive cancel control shown on both the buyer
 * and seller booking cards while a booking is cancellable (pending/confirmed
 * and the slot has not started).
 *
 * Thin client island — asks for confirmation via the shared ConfirmDialog,
 * then calls PATCH /api/bookings/[id] with action `cancel` and refreshes the
 * route so the server components re-render with the booking cancelled.
 */
export function CancelBookingButton({ bookingId }: CancelBookingButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleCancel = () => {
    setErrorMessage(null)
    startTransition(async () => {
      try {
        const response = await fetch(`/api/bookings/${bookingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancel' }),
        })

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as
            | { error?: { message?: string } }
            | null
          setErrorMessage(body?.error?.message ?? 'Something went wrong. Please try again.')
          setConfirmOpen(false)
          return
        }

        setConfirmOpen(false)
        router.refresh()
      } catch {
        setErrorMessage('Something went wrong. Please try again.')
        setConfirmOpen(false)
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-950/20 transition-colors"
      >
        Cancel booking
      </button>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Cancel this booking?"
        message="Are you sure you want to cancel? The time slot will be released and made available to other guests."
        confirmLabel={isPending ? 'Cancelling…' : 'Yes, cancel booking'}
        cancelLabel="Keep booking"
        confirmDisabled={isPending}
        onConfirm={handleCancel}
        onCancel={() => setConfirmOpen(false)}
        isDestructive
      />

      {errorMessage && (
        <span
          role="alert"
          aria-live="polite"
          className="max-w-[240px] text-right text-xs font-medium text-red-600 dark:text-red-400"
        >
          {errorMessage}
        </span>
      )}
    </div>
  )
}
