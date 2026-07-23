import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ListingForm } from '@/features/listings/components/ListingForm'

import { ListingCategory, BOOKING_MODES } from '@/features/listings/validation'

export const metadata = {
  title: 'Edit Listing | Quick Reserve',
  description: 'Edit your space listing on Quick Reserve',
}

interface EditListingPageProps {
  params: Promise<{ id: string }>
}

export default async function EditListingPage({ params }: EditListingPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch listing — RLS ensures only the seller_id=user can see their own draft/archived
  const { data: listing, error } = await supabase
    .from('listings')
    .select('id, title, description, category, price_cents, location, booking_mode, status, seller_id')
    .eq('id', id)
    .single()

  if (error || !listing) {
    notFound()
  }

  // Extra safety: if somehow a published listing was visible to another user,
  // ensure the current user is the actual owner before rendering the edit form.
  if (listing.seller_id !== user.id) {
    notFound()
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
            Edit listing
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Changes are saved immediately. Status is managed separately.
          </p>
        </header>

        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <ListingForm
            listingId={listing.id}
            initialData={{
              title: listing.title,
              description: listing.description ?? undefined,
              category: listing.category as ListingCategory,
              price_cents: listing.price_cents,
              location: listing.location,
              booking_mode: listing.booking_mode as (typeof BOOKING_MODES)[number],
            }}
          />
        </section>
      </div>
    </main>
  )
}
