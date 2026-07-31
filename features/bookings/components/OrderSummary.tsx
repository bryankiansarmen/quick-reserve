import Image from 'next/image'
import { formatPrice } from '@/lib/utils/currency'
import { formatAvailabilityDate } from '@/lib/utils/time'
import { isAllowedImageSrc } from '@/lib/utils/image'

interface OrderSummaryProps {
  listing: {
    title: string
    image: string | null
  }
  slot: {
    start_time: string
    end_time: string
  }
  seller: {
    full_name: string
  }
  amountCents: number
}

/**
 * OrderSummary: Sticky order summary for the checkout page.
 *
 * Server component — renders listing image, title, host, slot time, and
 * the price breakdown (single line item; no fees at MVP).
 */
export function OrderSummary({
  listing,
  slot,
  seller,
  amountCents,
}: OrderSummaryProps) {
  return (
    <aside className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden lg:sticky lg:top-8">
      {/* Listing image */}
      <div className="relative aspect-[4/3] bg-neutral-100 dark:bg-neutral-700">
        {listing.image && isAllowedImageSrc(listing.image) ? (
          <Image
            src={listing.image}
            alt={`Photo of ${listing.title}`}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 384px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-700 dark:to-neutral-600">
            <span className="text-4xl font-bold text-neutral-400 dark:text-neutral-300">
              {listing.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
            {listing.title}
          </h2>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Hosted by {seller.full_name}
          </p>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-neutral-600 dark:text-neutral-400">Date</dt>
            <dd className="font-medium text-neutral-900 dark:text-neutral-50">
              {formatAvailabilityDate(slot.start_time)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-neutral-600 dark:text-neutral-400">Time</dt>
            <dd className="font-medium text-neutral-900 dark:text-neutral-50">
              {formatSlotTimeRange(slot.start_time, slot.end_time)}
            </dd>
          </div>
        </dl>

        <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-neutral-600 dark:text-neutral-400">Booking total</span>
            <span className="font-semibold text-neutral-900 dark:text-neutral-50">
              {formatPrice(amountCents)}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}

function formatSlotTimeRange(startTime: string, endTime: string): string {
  const formatter = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${formatter.format(new Date(startTime))} – ${formatter.format(new Date(endTime))}`
}
