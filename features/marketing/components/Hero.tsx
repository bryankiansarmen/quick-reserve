import { Button } from '@/components/ui/Button'

/**
 * Hero: Above-the-fold marketing section for the homepage.
 *
 * Server component — static content, no interactivity.
 * Primary CTA drives visitors to /search; secondary CTA invites sellers.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Subtle decorative gradient accent */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent"
      />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
            Find your perfect space
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-400">
            Book photography studios, event venues, meeting rooms, and activity
            spaces by the hour. Real-time availability, secure payment, instant
            confirmation.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" href="/search">
              Browse Spaces
            </Button>
            <Button asChild size="lg" variant="secondary" href="/dashboard">
              List your space
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
