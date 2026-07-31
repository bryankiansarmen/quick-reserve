import Image from 'next/image'
import { formatPrice } from '@/lib/utils/currency'
import { formatAvailabilityDate, formatTimeRange } from '@/lib/utils/time'
import { isAllowedImageSrc } from '@/lib/utils/image'
import type { SellerBookingListItem } from '../types'
import { AcceptDeclineActions } from './AcceptDeclineActions'

interface SellerBookingCardProps {
  booking: SellerBookingListItem
}

const statusStyles: Record<SellerBookingListItem['status'], string> = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  confirmed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  completed: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

/**
 * SellerBookingCard: single incoming booking row for the seller dashboard.
 *
 * Server component — mirrors the buyer BookingCard layout but shows the
 * buyer's name instead of the location subtitle, and renders accept/decline
 * controls only when the listing is request-to-book AND the booking is still
 * pending.
 */
export function SellerBookingCard({ booking }: SellerBookingCardProps) {
  const { listing, slot, status } = booking

  const canAcceptOrDecline = booking.booking_mode === 'request' && status === 'pending'

  return (
    <li
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
      data-testid="seller-booking-card"
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
            <div className="flex items-center gap-2">
              <dt className="sr-only">Buyer</dt>
              <dd className="text-slate-600 dark:text-slate-400">
                Booked by{' '}
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {booking.buyer.full_name}
                </span>
              </dd>
            </div>
          </dl>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-lg font-semibold text-slate-900 dark:text-white">
              {formatPrice(booking.amount_cents)}
            </span>
            {canAcceptOrDecline && <AcceptDeclineActions bookingId={booking.id} />}
          </div>
        </div>
      </div>
    </li>
  )
}
