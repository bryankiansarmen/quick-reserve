import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BecomeSellerButton } from '@/features/profiles/components/BecomeSellerButton'
import { Button } from '@/components/ui/Button'

export const metadata = {
  title: 'Dashboard | Quick Reserve',
  description: 'User dashboard for Quick Reserve',
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, roles, avatar_url')
    .eq('id', user.id)
    .single()

  const isSeller = profile?.roles?.includes('seller') ?? false
  const displayName = profile?.full_name || user.email?.split('@')[0] || 'there'

  return (
    <main className="min-h-screen bg-slate-50 p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="border-b border-slate-200 pb-6 dark:border-slate-800">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Welcome back{displayName ? `, ${displayName}` : ''}
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Manage your Quick Reserve account and activity
          </p>
        </header>

        {/* Account info */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Account Profile
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
              <span className="text-xs uppercase text-slate-500 dark:text-slate-400">
                User ID
              </span>
              <p className="mt-1 font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
                {user.id}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
              <span className="text-xs uppercase text-slate-500 dark:text-slate-400">
                Email Address
              </span>
              <p className="mt-1 font-mono text-sm font-medium text-slate-900 dark:text-slate-100">
                {user.email}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800/50">
              <span className="text-xs uppercase text-slate-500 dark:text-slate-400">
                Roles
              </span>
              <p className="mt-1 flex gap-2 flex-wrap">
                {(profile?.roles ?? ['buyer']).map((role: string) => (
                  <span
                    key={role}
                    className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-slate-900 dark:bg-primary/20 dark:text-slate-300 capitalize"
                  >
                    {role}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </section>

        {/* My Bookings */}
        <section
          id="buyer-bookings-nav"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                My Bookings
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                View your upcoming and past bookings.
              </p>
            </div>
          </div>
          <div>
            <Button asChild id="my-bookings-link" href="/dashboard/bookings">
              View my bookings
            </Button>
          </div>
        </section>

        {/* Seller section */}
        {isSeller ? (
          <section
            id="seller-dashboard-nav"
            className="rounded-2xl border border-primary/20 bg-primary/10 p-6 shadow-sm dark:border-primary/40 dark:bg-primary/20 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white">
                <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016 2.993 2.993 0 0 0 2.25-1.016 3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Space Owner Dashboard
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Manage your listings and track incoming bookings.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild id="manage-listings-link" href="/dashboard/listings">
                Manage Listings
              </Button>
              <Button asChild variant="secondary" id="incoming-bookings-link" href="/dashboard/seller-bookings">
                Incoming Bookings
              </Button>
              <Button asChild variant="secondary" id="seller-earnings-link" href="/dashboard/earnings">
                Earnings
              </Button>
              <Button asChild variant="secondary" href="/dashboard/listings/new">
                + New listing
              </Button>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              List your space
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Have a studio, event venue, or meeting room to rent? Become a Space Owner to create listings and accept bookings.
            </p>
            <BecomeSellerButton />
          </section>
        )}
      </div>
    </main>
  )
}
