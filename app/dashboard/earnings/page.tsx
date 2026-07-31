import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getSellerEarnings } from '@/features/bookings/queries'
import { SellerEarningsCard } from '@/features/bookings/components/SellerEarningsCard'
import { formatPrice } from '@/lib/utils/currency'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Earnings | Quick Reserve',
  description: 'Track your total revenue and earnings history.',
}

/**
 * Seller earnings dashboard.
 *
 * SSR page: requires a session with the `seller` role, then shows a total
 * revenue summary card plus a history list of every booking that contributed
 * to it (only `confirmed` and `completed`). RLS on `bookings` scopes the
 * query to the authenticated seller's listings, so this page can never
 * surface another seller's earnings.
 */
export default async function SellerEarningsPage() {
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

  const { total_cents, bookings } = await getSellerEarnings(supabase)

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
            Earnings
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Track your space rental revenue from confirmed and completed bookings.
          </p>
        </header>

        {/* Total earnings summary */}
        <section aria-labelledby="summary-heading">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2
              id="summary-heading"
              className="text-sm font-medium text-slate-500 dark:text-slate-400"
            >
              Total Revenue
            </h2>
            <p
              className="mt-2 text-4xl font-bold tracking-tight text-slate-900 dark:text-white"
              data-testid="total-earnings"
            >
              {formatPrice(total_cents)}
            </p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Total from {bookings.length} confirmed/completed booking
              {bookings.length === 1 ? '' : 's'} across all your listings.
            </p>
          </div>
        </section>

        {/* Earnings history */}
        <section aria-labelledby="history-heading">
          <h2
            id="history-heading"
            className="mb-4 text-xl font-semibold text-slate-900 dark:text-white"
          >
            Earnings History
          </h2>
          {bookings.length > 0 ? (
            <ul className="space-y-3">
              {bookings.map((booking) => (
                <SellerEarningsCard key={booking.id} booking={booking} />
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No earnings yet. Confirmed and completed bookings will appear here.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
