'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AvailabilityCalendar } from './AvailabilityCalendar'
import type { AvailabilitySlot } from '../types'

interface BookingSectionProps {
  listingId: string
  bookingMode: 'instant' | 'request'
  slots: AvailabilitySlot[]
  isAuthenticated: boolean
}

type BookingState = {
  status: 'idle' | 'submitting'
  error: string | null
}

/**
 * BookingSection: Slot selection + booking creation for the listing detail page.
 *
 * Features:
 * - Interactive slot selection (available slots only)
 * - "Book Now" / "Request to Book" CTA that creates a booking via `POST /api/bookings`
 * - Handles unauthenticated users (redirect to login), slot-unavailable (409),
 *   and generic errors inline
 * - On success, navigates to the checkout page
 *
 * Used in:
 * - Listing detail page
 */
export function BookingSection({
  listingId,
  bookingMode,
  slots,
  isAuthenticated,
}: BookingSectionProps) {
  const router = useRouter()
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [state, setState] = useState<BookingState>({ status: 'idle', error: null })

  const selectedSlot = slots.find(slot => slot.id === selectedSlotId) ?? null
  const hasAvailableSlots = slots.some(slot => !slot.is_booked)
  const ctaLabel = bookingMode === 'instant' ? 'Book Now' : 'Request to Book'

  async function handleBook() {
    if (!selectedSlotId) {
      setState({ status: 'idle', error: 'Please select a time slot first.' })
      return
    }

    if (!isAuthenticated) {
      const redirectTo = `/listings/${listingId}`
      router.push(`/login?redirectTo=${encodeURIComponent(redirectTo)}`)
      return
    }

    setState({ status: 'submitting', error: null })

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: listingId, slot_id: selectedSlotId }),
      })

      const data = await response.json()

      if (response.ok && data.booking_id) {
        router.push(`/checkout/${data.booking_id}`)
        return
      }

      if (response.status === 409 && data.error?.code === 'SLOT_UNAVAILABLE') {
        setState({
          status: 'idle',
          error:
            data.error.message ||
            'This slot is no longer available. Please choose a different time slot.',
        })
        return
      }

      if (response.status === 401) {
        const redirectTo = `/listings/${listingId}`
        router.push(`/login?redirectTo=${encodeURIComponent(redirectTo)}`)
        return
      }

      setState({
        status: 'idle',
        error:
          data.error?.message ||
          'Something went wrong creating your booking. Please try again.',
      })
    } catch {
      setState({
        status: 'idle',
        error: 'Network error. Please check your connection and try again.',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Selection summary + CTA */}
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
              {ctaLabel}
            </h2>
            <p
              className="mt-1 text-sm text-neutral-600 dark:text-neutral-400"
              aria-live="polite"
            >
              {selectedSlot ? (
                <span className="font-medium text-neutral-900 dark:text-neutral-50">
                  Selected: {formatSlotSummary(selectedSlot)}
                </span>
              ) : hasAvailableSlots ? (
                'Select an available time slot above to continue.'
              ) : (
                'No available time slots for this listing right now.'
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={handleBook}
            disabled={state.status === 'submitting' || !selectedSlotId}
            className="px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-busy={state.status === 'submitting'}
          >
            {state.status === 'submitting' ? 'Creating booking…' : ctaLabel}
          </button>
        </div>

        {state.error && (
          <div
            role="alert"
            className="mt-4 rounded-lg bg-danger/10 dark:bg-danger/20 border border-danger/30 px-4 py-3 text-sm text-danger"
          >
            {state.error}
          </div>
        )}
      </div>

      <AvailabilityCalendar
        slots={slots}
        selectedSlotId={selectedSlotId}
        onSlotSelect={id => {
          setSelectedSlotId(id)
          setState(prev => (prev.error ? { status: 'idle', error: null } : prev))
        }}
      />
    </div>
  )
}

function formatSlotSummary(slot: AvailabilitySlot): string {
  const start = new Date(slot.start_time)
  const end = new Date(slot.end_time)
  const date = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(start)
  const time = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(start)
  const endTime = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(end)
  return `${date} · ${time} – ${endTime}`
}
