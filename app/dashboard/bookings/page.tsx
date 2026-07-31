import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getBuyerBookings } from '@/features/bookings/queries'
import { BookingCard } from '@/features/bookings/components/BookingCard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My Bookings | Quick Reserve',
  description: 'View your upcoming and past bookings on Quick Reserve.',
}

/**
 * Buyer bookings dashboard.
 *
 * SSR page: requires a session, then renders two static sections —
 * Upcoming (future slots, active status) and Past (everything else).
 * RLS on `bookings` scopes the query to the authenticated buyer, so this
 * page can never surface another user's bookings.
 */
export default async function BuyerBookingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { upcoming, past } = await getBuyerBookings(supabase)

  return (
    <main className="min-h-screen bg-slate-50 p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-8">
        <header>
          <div className="mb-1">
            <Link
              href="/dashboard"
              className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              ← Dashboard
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            My Bookings
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {upcoming.length + past.length === 0
              ? 'No bookings yet'
              : `${upcoming.length} upcoming · ${past.length} past`}
          </p>
        </header>

        {/* Upcoming */}
        <section aria-labelledby="upcoming-heading">
          <h2
            id="upcoming-heading"
            className="mb-4 text-xl font-semibold text-slate-900 dark:text-white"
          >
            Upcoming
          </h2>
          {upcoming.length > 0 ? (
            <ul className="space-y-3">
              {upcoming.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </ul>
          ) : (
            <BookingSectionEmpty
              message="You have no upcoming bookings."
              actionHref="/search"
              actionLabel="Browse spaces"
            />
          )}
        </section>

        {/* Past */}
        <section aria-labelledby="past-heading">
          <h2
            id="past-heading"
            className="mb-4 text-xl font-semibold text-slate-900 dark:text-white"
          >
            Past
          </h2>
          {past.length > 0 ? (
            <ul className="space-y-3">
              {past.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </ul>
          ) : (
            <BookingSectionEmpty message="No past bookings yet." />
          )}
        </section>
      </div>
    </main>
  )
}

function BookingSectionEmpty({
  message,
  actionHref,
  actionLabel,
}: {
  message: string
  actionHref?: string
  actionLabel?: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}
