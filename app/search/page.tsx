import { Suspense } from 'react'
import type { Metadata } from 'next'
import { searchListings } from '@/features/listings/queries'
import { searchQuerySchema } from '@/features/listings/validation'
import { SearchPageClient } from '@/features/search/components/SearchPageClient'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Search Venues | Quick Reserve',
  description:
    'Browse bookable photography studios, event venues, meeting rooms, and activity spaces. Find the perfect space for your next project.',
  keywords:
    'venue rental, studio rental, event space, meeting room, activity space',
  openGraph: {
    title: 'Search Venues | Quick Reserve',
    description:
      'Browse bookable spaces for your next project',
    type: 'website',
    url: 'https://quickreserve.com/search',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Search Venues | Quick Reserve',
    description: 'Browse bookable spaces for your next project',
  },
}

interface SearchPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

/**
 * Search/Browse Page - Server Component
 *
 * Responsibilities:
 * - Parse and validate URL query parameters
 * - Fetch initial results server-side for SSR
 * - Pass data to client component for interactivity
 * - Set SEO metadata
 *
 * URL structure: /search?category=...&location=...&minPrice=...&maxPrice=...&date=...&page=...&sort=...
 */
export default async function SearchPage({ searchParams }: SearchPageProps) {
  // Next.js 16: searchParams is a Promise
  const params = await searchParams

  // Parse and validate query parameters
  const rawFilters = {
    category: params.category,
    location: params.location,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    date: params.date,
    page: params.page,
    pageSize: params.pageSize,
    sort: params.sort,
  }

  // Validate with schema (provides sensible defaults)
  const parseResult = searchQuerySchema.safeParse(rawFilters)

  if (!parseResult.success) {
    console.warn('[SearchPage] Invalid query params:', parseResult.error)
  }

  const filters = parseResult.success
    ? parseResult.data
    : { sort: 'newest' as const, page: 1 }

  // Fetch initial results server-side for SEO
  let initialData
  try {
    initialData = await searchListings(filters)
  } catch (error) {
    console.error('[SearchPage] Failed to fetch initial listings:', error)
    // Return empty results on error (error boundary will handle render)
    initialData = {
      data: [],
      pagination: { page: 1, pageSize: 20, total: 0 },
    }
  }

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900">
      {/* Page Header */}
      <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-semibold text-neutral-900 dark:text-neutral-50">
            Search Venues
          </h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            Find the perfect space for your next project
          </p>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Suspense fallback={<SearchPageSkeleton />}>
          <SearchPageClient initialData={initialData} initialFilters={filters} />
        </Suspense>
      </div>

      {/* Structured Data for SEO */}
      <StructuredData results={initialData} />
    </div>
  )
}

/**
 * Skeleton loader - displayed while page is rendering.
 * Matches the layout of the actual content to minimize CLS.
 */
function SearchPageSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-pulse">
      {/* Sidebar skeleton */}
      <aside className="lg:col-span-1">
        <div className="h-96 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700" />
      </aside>

      {/* Results grid skeleton */}
      <main className="lg:col-span-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700"
            >
              <div className="aspect-[4/3] bg-neutral-200 dark:bg-neutral-700" />
              <div className="p-4 space-y-3">
                <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
                <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

/**
 * Generate JSON-LD structured data for SEO.
 * Tells search engines what this page is about.
 */
function StructuredData({
  results,
}: {
  results: Awaited<ReturnType<typeof searchListings>>
}) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'Search Venues | Quick Reserve',
    description:
      'Browse bookable photography studios, event venues, meeting rooms, and activity spaces',
    url: 'https://quickreserve.com/search',
    itemListElement: results.data.map((listing, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        '@id': `https://quickreserve.com/listings/${listing.id}`,
        name: listing.title,
        url: `https://quickreserve.com/listings/${listing.id}`,
        description: listing.title,
        offers: {
          '@type': 'Offer',
          price: (listing.price_cents / 100).toFixed(2),
          priceCurrency: 'USD',
        },
        ...(listing.review_count > 0 && {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: listing.avg_rating.toFixed(1),
            reviewCount: listing.review_count,
          },
        }),
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      suppressHydrationWarning
    />
  )
}
