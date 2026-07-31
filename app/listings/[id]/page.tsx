import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getListingDetail, getSimilarListings } from '@/features/listings/queries'
import { createClient } from '@/lib/supabase/server'
import { ImageGallery } from '@/features/listings/components/ImageGallery'
import { BookingSection } from '@/features/listings/components/BookingSection'
import { SellerInfoCard } from '@/features/listings/components/SellerInfoCard'
import { ListingCard } from '@/features/listings/components/ListingCard'
import { CATEGORY_LABELS } from '@/lib/constants/categories'

export const dynamic = 'force-dynamic'
// Cache published listings for 5 minutes to improve performance
// Draft listings will always be fresh (dynamic above takes precedence)
export const revalidate = 300

interface ListingDetailPageProps {
  params: Promise<{ id: string }>
}

/**
 * Generate metadata for SEO (title, description, Open Graph, Twitter Card)
 */
export async function generateMetadata({ params }: ListingDetailPageProps): Promise<Metadata> {
  const resolvedParams = await params
  const listing = await getListingDetail(resolvedParams.id)

  if (!listing) {
    return {
      title: 'Listing Not Found | Quick Reserve',
      description: 'This listing does not exist or is no longer available.',
    }
  }

  const pricePerHour = (listing.price_cents / 100).toFixed(2)
  const description =
    listing.description?.slice(0, 160) ||
    `Book ${listing.title} in ${listing.location} for $${pricePerHour}/hour`

  return {
    title: `${listing.title} | Quick Reserve`,
    description,
    keywords: `${listing.category}, ${listing.location}, venue rental`,
    openGraph: {
      title: listing.title,
      description,
      type: 'website',
      url: `https://quickreserve.com/listings/${listing.id}`,
      ...(listing.images[0] && {
        images: [
          {
            url: listing.images[0],
            width: 1200,
            height: 630,
            alt: listing.title,
          },
        ],
      }),
    },
    twitter: {
      card: 'summary_large_image',
      title: listing.title,
      description,
      ...(listing.images[0] && {
        images: [listing.images[0]],
      }),
    },
  }
}

/**
 * Listing Detail Page - Server Component
 *
 * Responsibilities:
 * - Fetch listing detail with access control
 * - Fetch similar listings for "You may also like" section
 * - Render SSR-friendly layout with proper SEO
 * - Delegate interactive elements to client components
 *
 * Access Control:
 * - Published listings: accessible to anyone
 * - Draft/archived listings: accessible only to owner
 * - Nonexistent: 404
 * - Unauthorized access: 404
 */
export default async function ListingDetailPage({ params }: ListingDetailPageProps) {
  const resolvedParams = await params

  // Get current user for access control
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch listing detail
  const listing = await getListingDetail(resolvedParams.id, user?.id)

  if (!listing) {
    notFound()
  }

  // Fetch similar listings (same category, excluding current listing)
  const similarListings = await getSimilarListings(listing.category, listing.id, 4)

  const pricePerHour = (listing.price_cents / 100).toFixed(2)
  const categoryLabel =
    CATEGORY_LABELS[listing.category as keyof typeof CATEGORY_LABELS] ||
    listing.category

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900">
      {/* Page Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header: Title, Location, Price */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-50">
                {listing.title}
              </h1>
              <p className="mt-2 text-lg text-neutral-600 dark:text-neutral-400">
                {listing.location}
              </p>
            </div>

            {/* Price Badge */}
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">
                ${pricePerHour}
                <span className="text-lg font-normal text-neutral-600 dark:text-neutral-400 ml-2">
                  /hour
                </span>
              </div>

              {/* Booking Mode Badge */}
              <div className="mt-2">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    listing.booking_mode === 'instant'
                      ? 'bg-success/10 dark:bg-success/20 text-success'
                      : 'bg-warning/10 dark:bg-warning/20 text-warning'
                  }`}
                >
                  {listing.booking_mode === 'instant'
                    ? 'Instant Book'
                    : 'Request to Book'}
                </span>
              </div>
            </div>
          </div>

          {/* Category & Review Preview */}
          <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
            <span className="inline-block px-3 py-1 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 font-medium">
              {categoryLabel}
            </span>

            {listing.review_count > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-warning">★</span>
                <span className="font-medium">
                  {listing.avg_rating.toFixed(1)} ({listing.review_count} reviews)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Left Column: Images, Description, Availability (2 cols on lg) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <Suspense fallback={<ImageGallerySkeleton />}>
              <ImageGallery images={listing.images} title={listing.title} />
            </Suspense>

            {/* Description */}
            {listing.description && (
              <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-4">
                  About this space
                </h2>
                <p className="text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                  {listing.description}
                </p>
              </div>
            )}

            {/* Availability + Booking */}
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6">
              <Suspense fallback={<AvailabilityCalendarSkeleton />}>
                <BookingSection
                  listingId={listing.id}
                  bookingMode={listing.booking_mode}
                  slots={listing.available_slots}
                  isAuthenticated={Boolean(user)}
                />
              </Suspense>
            </div>
          </div>

          {/* Right Column: Seller Info (1 col on lg, sticky) */}
          <div className="lg:col-span-1">
            <Suspense fallback={<SellerInfoCardSkeleton />}>
              <SellerInfoCard seller={listing.seller} />
            </Suspense>
          </div>
        </div>

        {/* You May Also Like Section */}
        {similarListings.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-6">
              You may also like
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {similarListings.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Structured Data for SEO */}
      <StructuredData listing={listing} />
    </div>
  )
}

/**
 * JSON-LD Structured Data for search engines
 */
function StructuredData({
  listing,
}: {
  listing: Awaited<ReturnType<typeof getListingDetail>>
}) {
  if (!listing) return null

  const pricePerHour = (listing.price_cents / 100).toFixed(2)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description || listing.title,
    image: listing.images,
    offers: {
      '@type': 'Offer',
      price: pricePerHour,
      priceCurrency: 'USD',
      availability: listing.available_slots.length > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
    ...(listing.review_count > 0 && {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: listing.avg_rating.toFixed(1),
        reviewCount: listing.review_count,
      },
    }),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      suppressHydrationWarning
    />
  )
}

/**
 * Skeleton loaders for Suspense boundaries
 */
function ImageGallerySkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="aspect-[16/9] sm:aspect-[4/3] md:aspect-[16/9] bg-neutral-200 dark:bg-neutral-700 rounded-lg" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-20 h-20 bg-neutral-200 dark:bg-neutral-700 rounded-lg" />
        ))}
      </div>
    </div>
  )
}

function AvailabilityCalendarSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded" />
          <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded" />
        </div>
      ))}
    </div>
  )
}

function SellerInfoCardSkeleton() {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6 space-y-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-neutral-200 dark:bg-neutral-700 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
          <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
        </div>
      </div>
      <div className="h-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
      <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded" />
    </div>
  )
}
