'use client'

import Image from 'next/image'
import Link from 'next/link'
import { formatPriceShort } from '@/lib/utils/currency'
import { getFirstAllowedImage } from '@/lib/utils/image'
import type { ListingSearchResult } from '../types'

interface ListingCardProps {
  listing: ListingSearchResult
}

/**
 * ListingCard: Reusable card component for displaying a listing in search results.
 *
 * Features:
 * - 4:3 aspect ratio image (prevents layout shift)
 * - Price, title, location, and rating
 * - Entire card is clickable link to detail page
 * - Responsive image optimization via Next.js <Image>
 * - Accessible: proper link semantics, alt text for images
 *
 * Used in:
 * - Search results grid
 * - Listing detail page
 */
export function ListingCard({ listing }: ListingCardProps) {
  const displayImage = getFirstAllowedImage(listing.images)

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group block rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-lg transition-shadow duration-200 dark:border-slate-800 dark:bg-slate-900"
      aria-label={`View details for ${listing.title}`}
      data-testid="listing-card"
    >
      {/* Image: 4:3 aspect ratio with zoom on hover */}
      <div className="relative aspect-[4/3] bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <Image
          src={displayImage}
          alt={listing.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          priority={false}
        />
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Title */}
        <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-50 line-clamp-1">
          {listing.title}
        </h3>

        {/* Location */}
        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1">
          {listing.location}
        </p>

        {/* Price and Rating Row */}
        <div className="flex items-center justify-between pt-2">
          {/* Price */}
          <div className="text-lg font-semibold text-slate-900 dark:text-white">
            {formatPriceShort(listing.price_cents)}
            <span className="text-sm font-normal text-slate-600 dark:text-slate-400 ml-1">
              /hour
            </span>
          </div>

          {/* Rating - only show if reviews exist */}
          {listing.review_count > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <span className="text-warning">★</span>
              <span className="font-medium text-slate-900 dark:text-slate-50">
                {listing.avg_rating.toFixed(1)}
              </span>
              <span className="text-slate-500 dark:text-slate-400">
                ({listing.review_count})
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
