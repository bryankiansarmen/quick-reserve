import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ListingForm } from '@/features/listings/components/ListingForm'

export const metadata = {
  title: 'Create Listing | Quick Reserve',
  description: 'Create a new space listing on Quick Reserve',
}

export default async function NewListingPage() {
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

  return (
    <main className="min-h-screen bg-slate-50 p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-2xl space-y-6">
        <header>
          <div className="mb-1">
            <Link
              href="/dashboard/listings"
              className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            >
              ← My Listings
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Create listing
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Listings are saved as drafts until you publish them.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <ListingForm />
        </section>
      </div>
    </main>
  )
}
