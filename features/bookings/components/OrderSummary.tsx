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
    <aside className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden lg:sticky lg:top-8">
      {/* Listing image */}
      <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-700">
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
            <span className="text-4xl font-bold text-slate-400 dark:text-slate-300">
              {listing.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      <div className="p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
            {listing.title}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Hosted by {seller.full_name}
          </p>
        </div>

        <dl className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-slate-600 dark:text-slate-400">Date</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-50">
              {formatAvailabilityDate(slot.start_time)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-600 dark:text-slate-400">Time</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-50">
              {formatSlotTimeRange(slot.start_time, slot.end_time)}
            </dd>
          </div>
        </dl>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400">Booking total</span>
            <span className="font-semibold text-slate-900 dark:text-slate-50">
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
