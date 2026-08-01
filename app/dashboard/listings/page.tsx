import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ListingStatusToggle from '@/features/listings/components/ListingStatusToggle'

export const metadata = {
  title: 'My Listings | Quick Reserve',
  description: 'Manage your space listings on Quick Reserve',
}

const statusStyles: Record<string, string> = {
  draft:
    'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  published:
    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  archived:
    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
}

const categoryLabels: Record<string, string> = {
  'photography-studio': 'Photography Studio',
  'event-venue': 'Event Venue',
  'meeting-room': 'Meeting Room',
  'activity-space': 'Activity Space',
}

export default async function SellerListingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verify seller role
  const { data: profile } = await supabase
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .single()

  if (!profile?.roles?.includes('seller')) {
    redirect('/dashboard')
  }

  const { data: listings, error } = await supabase
    .from('listings')
    .select(
      `
      id,
      title,
      category,
      price_cents,
      status,
      location,
      created_at,
      images,
      slot_count:availability_slots(count)
      `
    )
    .eq('seller_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <main className="min-h-screen bg-slate-50 p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <div className="mb-1">
              <Link
                href="/dashboard"
                className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                ← Dashboard
              </Link>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              My Listings
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {listings?.length
                ? `${listings.length} listing${listings.length === 1 ? '' : 's'}`
                : 'No listings yet'}
            </p>
          </div>
          <Link
            id="create-listing-btn"
            href="/dashboard/listings/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
          >
            <svg
              className="h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New listing
          </Link>
        </header>

        {error && (
          <div
            className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            role="alert"
          >
            Could not load listings. Please refresh and try again.
          </div>
        )}

        {!error && (!listings || listings.length === 0) ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20">
              <svg
                className="h-6 w-6 text-primary dark:text-slate-400"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016 2.993 2.993 0 0 0 2.25-1.016 3.001 3.001 0 0 0 3.75.614"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              No listings yet
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Create your first listing to start accepting bookings.
            </p>
            <Link
              href="/dashboard/listings/new"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
            >
              Create your first listing
            </Link>
          </section>
        ) : (
          <ul className="space-y-3">
            {listings?.map((listing) => (
              <li
                key={listing.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 hover:border-primary/30 dark:hover:border-primary/40 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-semibold text-slate-900 dark:text-white">
                        {listing.title}
                      </h2>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${statusStyles[listing.status] ?? ''}`}
                      >
                        {listing.status}
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                      {categoryLabels[listing.category] ?? listing.category} ·{' '}
                      {listing.location} ·{' '}
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        ${(listing.price_cents / 100).toFixed(2)} / slot
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <ListingStatusToggle
                      listingId={listing.id}
                      currentStatus={listing.status as 'draft' | 'published' | 'archived'}
                      hasImages={listing.images && listing.images.length > 0}
                    />
                    <Link
                      href={`/dashboard/listings/${listing.id}/edit`}
                      className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/dashboard/listings/${listing.id}/slots`}
                      className="shrink-0 flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      Availability
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        ((listing.slot_count as unknown as { count: number }[])?.[0]?.count ?? 0) === 0
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        {((listing.slot_count as unknown as { count: number }[])?.[0]?.count ?? 0)}
                      </span>
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
