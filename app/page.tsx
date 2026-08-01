import type { Metadata } from 'next'
import { Hero } from '@/features/marketing/components/Hero'
import { FeaturedListings } from '@/features/marketing/components/FeaturedListings'
import { CategoryGrid } from '@/features/marketing/components/CategoryGrid'
import { HowItWorks } from '@/features/marketing/components/HowItWorks'
import { TrustSection } from '@/features/marketing/components/TrustSection'
import { Button } from '@/components/ui/Button'
import { getFeaturedListings, getCategoryCounts } from '@/features/marketing/queries'

export const metadata: Metadata = {
  title: 'Quick Reserve | Book Studios, Venues & Spaces',
  description:
    'Find and book photography studios, event venues, meeting rooms, and activity spaces by the hour. Real-time availability, secure payment, instant confirmation.',
  keywords:
    'venue rental, studio rental, event space, meeting room, activity space, photography studio',
  openGraph: {
    title: 'Quick Reserve | Book Studios, Venues & Spaces',
    description:
      'Find and book the perfect space for your next project',
    type: 'website',
    url: 'https://quickreserve.com',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quick Reserve | Book Studios, Venues & Spaces',
    description: 'Find and book the perfect space for your next project',
  },
}

export default async function HomePage() {
  const [featuredListings, categoryCounts] = await Promise.all([
    getFeaturedListings(8),
    getCategoryCounts(),
  ])

  return (
    <div className="flex flex-col">
      <Hero />
      <FeaturedListings listings={featuredListings} />
      <CategoryGrid counts={categoryCounts} />
      <TrustSection />
      <HowItWorks />

      {/* Final CTA */}
      <section className="bg-primary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Ready to get started?
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/90">
            Browse available spaces or list your own and start accepting
            bookings today.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" variant="secondary" href="/search">
              Browse Spaces
            </Button>
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg border-2 border-white/40 px-6 py-3 text-base font-semibold text-white transition-colors hover:border-white hover:bg-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
            >
              List your space
            </a>
          </div>
        </div>
      </section>

      <StructuredData />
    </div>
  )
}

/**
 * JSON-LD structured data for SEO.
 * Tells search engines what the site is and enables sitelinks searchbox.
 */
function StructuredData() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Quick Reserve',
    description:
      'Book photography studios, event venues, meeting rooms, and activity spaces by the hour',
    url: 'https://quickreserve.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://quickreserve.com/search?location={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
    />
  )
}
