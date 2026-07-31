import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSellerBookings } from '@/features/bookings/queries'
import { SellerBookingCard } from '@/features/bookings/components/SellerBookingCard'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Incoming Bookings | Quick Reserve',
  description: 'Accept and decline incoming booking requests on your listings.',
}

/**
 * Seller bookings dashboard.
 *
 * SSR page: requires a session with the `seller` role, then renders two
 * static sections — Pending (request-to-book bookings awaiting a decision,
 * with accept/decline controls) and History (every other status). RLS on
 * `bookings` scopes the query to the authenticated seller's listings, so
 * this page can never surface another seller's bookings.
 */
export default async function SellerBookingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .single()

  if (!profile?.roles?.includes('seller')) {
    redirect('/dashboard')
  }

  const { pending, other } = await getSellerBookings(supabase)

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
            Incoming Bookings
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {pending.length + other.length === 0
              ? 'No bookings yet'
              : `${pending.length} pending · ${other.length} past`}
          </p>
        </header>

        {/* Pending — needs action */}
        <section aria-labelledby="pending-heading">
          <h2
            id="pending-heading"
            className="mb-4 text-xl font-semibold text-slate-900 dark:text-white"
          >
            Pending
          </h2>
          {pending.length > 0 ? (
            <ul className="space-y-3">
              {pending.map((booking) => (
                <SellerBookingCard key={booking.id} booking={booking} />
              ))}
            </ul>
          ) : (
            <SellerSectionEmpty message="No bookings waiting for a decision." />
          )}
        </section>

        {/* History — every other status */}
        <section aria-labelledby="history-heading">
          <h2
            id="history-heading"
            className="mb-4 text-xl font-semibold text-slate-900 dark:text-white"
          >
            History
          </h2>
          {other.length > 0 ? (
            <ul className="space-y-3">
              {other.map((booking) => (
                <SellerBookingCard key={booking.id} booking={booking} />
              ))}
            </ul>
          ) : (
            <SellerSectionEmpty message="No past bookings yet." />
          )}
        </section>
      </div>
    </main>
  )
}

function SellerSectionEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
    </div>
  )
}
