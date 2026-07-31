import Image from 'next/image'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils/currency'
import { formatAvailabilityDate, formatTimeRange } from '@/lib/utils/time'
import { isAllowedImageSrc } from '@/lib/utils/image'
import { ReviewButton } from '@/features/reviews/components/ReviewButton'
import type { BuyerBookingListItem } from '../types'

interface BookingCardProps {
  booking: BuyerBookingListItem
}

const statusStyles: Record<BuyerBookingListItem['status'], string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  completed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

/**
 * BookingCard: single buyer booking row for the dashboard.
 *
 * Server component — renders the listing thumbnail (with initials fallback),
 * title, location, slot date + time, amount, a color-coded status badge that
 * always pairs color with a text label (per design system), and a status-
 * appropriate call-to-action.
 */
export function BookingCard({ booking }: BookingCardProps) {
  const { listing, slot, status } = booking

  const cta =
    status === 'pending' ? (
      <Link
        href={`/checkout/${booking.id}`}
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
      >
        Complete payment
      </Link>
    ) : status === 'confirmed' || status === 'completed' ? (
      <Link
        href={`/checkout/${booking.id}/success`}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
      >
        View confirmation
      </Link>
    ) : null

  return (
    <li
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      data-testid="booking-card"
    >
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 sm:h-28 sm:w-28">
          {listing.image && isAllowedImageSrc(listing.image) ? (
            <Image
              src={listing.image}
              alt={`Photo of ${listing.title}`}
              fill
              className="object-cover"
              sizes="112px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600">
              <span className="text-3xl font-bold text-slate-400 dark:text-slate-300">
                {listing.title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-semibold text-slate-900 dark:text-white">
                  {listing.title}
                </h2>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[status]}`}
                >
                  {status}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                {listing.location}
              </p>
            </div>
          </div>

          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <dt className="sr-only">Date</dt>
              <dd className="font-medium text-slate-700 dark:text-slate-300">
                {formatAvailabilityDate(slot.start_time)}
              </dd>
            </div>
            <div className="flex items-center gap-2">
              <dt className="sr-only">Time</dt>
              <dd className="text-slate-600 dark:text-slate-400">
                {formatTimeRange(slot.start_time, slot.end_time)}
              </dd>
            </div>
          </dl>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-lg font-semibold text-slate-900 dark:text-white">
              {formatPrice(booking.amount_cents)}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {cta}
              {status === 'completed' && !booking.has_review && (
                <ReviewButton bookingId={booking.id} listingTitle={listing.title} />
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  )
}
