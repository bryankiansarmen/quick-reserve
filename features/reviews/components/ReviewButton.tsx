'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ReviewDialog } from './ReviewDialog'

interface ReviewButtonProps {
  bookingId: string
  listingTitle: string
}

/**
 * ReviewButton: entrypoint for submitting a review on a completed booking.
 *
 * Client component — opens the ReviewDialog on click, and after a successful
 * submission refreshes the current route so the dashboard re-renders with the
 * review button hidden (a booking can only be reviewed once).
 */
export function ReviewButton({ bookingId, listingTitle }: ReviewButtonProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  function handleSubmitted() {
    setIsOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-700 shadow-sm hover:bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-amber-700 dark:bg-slate-800 dark:text-amber-300 dark:hover:bg-slate-700 transition-colors"
      >
        Leave review
      </button>
      <ReviewDialog
        bookingId={bookingId}
        listingTitle={listingTitle}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmitted={handleSubmitted}
      />
    </>
  )
}
