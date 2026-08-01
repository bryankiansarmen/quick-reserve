import Link from 'next/link'
import { ListingCard } from '@/features/listings/components/ListingCard'
import { Button } from '@/components/ui/Button'
import type { ListingSearchResult } from '@/features/listings/types'

interface FeaturedListingsProps {
  listings: ListingSearchResult[]
}

/**
 * FeaturedListings: Most recent published listings on the homepage.
 *
 * Server component — reuses the existing ListingCard from search. Renders an
 * empty state with a seller CTA when no published listings exist yet.
 */
export function FeaturedListings({ listings }: FeaturedListingsProps) {
  return (
    <section className="bg-white dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Featured Spaces
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Newest bookable spaces on Quick Reserve
            </p>
          </div>
          <Link
            href="/search"
            className="text-sm font-medium text-primary hover:text-primary-dark transition-colors"
          >
            View all spaces →
          </Link>
        </div>

        {listings.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-12 text-center">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              No spaces available yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
              Be the first to list your studio, venue, meeting room, or activity
              space and start accepting bookings.
            </p>
            <div className="mt-6 flex justify-center">
              <Button asChild href="/dashboard">
                List your space
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
