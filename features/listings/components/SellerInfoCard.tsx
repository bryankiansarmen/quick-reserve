import Image from 'next/image'

interface SellerInfoCardProps {
  seller: {
    id: string
    full_name: string
    avatar_url: string | null
    bio: string | null
    avg_rating: number
    review_count: number
  }
}

/**
 * SellerInfoCard: Display seller profile with trust signals.
 *
 * Features:
 * - Avatar image or initials fallback
 * - Seller name and bio
 * - Rating display (only shown if reviews exist)
 * - Contact button (disabled for MVP with tooltip)
 * - Sticky positioning on desktop (stays visible while scrolling)
 * - Responsive layout (full width on mobile, sidebar on desktop)
 *
 * Server Component (no client-side interactivity, SSR only)
 *
 * Used in:
 * - Listing detail page (right sidebar on lg+)
 */
export function SellerInfoCard({ seller }: SellerInfoCardProps) {
  // Generate initials from full name for avatar fallback
  const initials = seller.full_name
    .split(' ')
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside className="lg:sticky lg:top-4 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6 space-y-4">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 flex-shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center">
          {seller.avatar_url ? (
            <Image
              src={seller.avatar_url}
              alt={seller.full_name}
              fill
              className="object-cover"
              sizes="64px"
            />
          ) : (
            <span className="text-white font-bold text-lg">{initials}</span>
          )}
        </div>

        {/* Name and rating (compact on mobile) */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-neutral-900 dark:text-neutral-50 truncate">
            {seller.full_name}
          </h3>

          {/* Rating - only show if reviews exist */}
          {seller.review_count > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-warning text-sm">★</span>
              <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                {seller.avg_rating.toFixed(1)}
              </span>
              <span className="text-xs text-neutral-600 dark:text-neutral-400">
                ({seller.review_count})
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bio */}
      {seller.bio && (
        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
          <p className="text-sm text-neutral-700 dark:text-neutral-300 line-clamp-3">
            {seller.bio}
          </p>
        </div>
      )}

      {/* Contact button (disabled for MVP) */}
      <div className="pt-2">
        <button
          disabled
          className="w-full px-4 py-2 rounded-lg bg-primary text-white font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-opacity group relative"
          title="Messaging available in a future release"
        >
          Contact Seller

          {/* Tooltip */}
          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-neutral-900 dark:bg-neutral-700 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
            Messaging available in a future release
          </span>
        </button>
      </div>

      {/* Trust signals footer */}
      <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-xs text-neutral-600 dark:text-neutral-400">
        <svg
          className="w-4 h-4 mr-1"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        Verified seller
      </div>
    </aside>
  )
}
