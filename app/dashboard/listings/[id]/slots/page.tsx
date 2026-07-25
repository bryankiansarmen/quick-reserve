import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { fetchSlots } from '@/features/listings/slot-actions'
import { AddSlotForm } from '@/features/listings/components/AddSlotForm'
import { SlotList } from '@/features/listings/components/SlotList'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ListingAvailabilityPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  // Verify authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    redirect('/login')
  }
  
  // Fetch listing and verify ownership
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('id, title, category, status, seller_id')
    .eq('id', id)
    .single()
  
  if (listingError || !listing) {
    redirect('/dashboard/listings')
  }
  
  if (listing.seller_id !== user.id) {
    redirect('/dashboard/listings')
  }
  
  // Fetch slots for display (SSR)
  const slots = await fetchSlots(id)
  
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb navigation */}
        <nav className="mb-6 text-sm" aria-label="Breadcrumb">
          <ol className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
            <li><a href="/dashboard" className="hover:text-slate-900 dark:hover:text-white">Dashboard</a></li>
            <li aria-hidden="true">›</li>
            <li><a href="/dashboard/listings" className="hover:text-slate-900 dark:hover:text-white">Listings</a></li>
            <li aria-hidden="true">›</li>
            <li className="text-slate-900 dark:text-white font-medium">{listing.title}</li>
            <li aria-hidden="true">›</li>
            <li className="text-slate-900 dark:text-white">Availability</li>
          </ol>
        </nav>
        
        {/* Listing info card */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
                {listing.title}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 capitalize">
                {listing.category.replace('-', ' ')} • Status: {listing.status}
              </p>
            </div>
            <a
              href={`/dashboard/listings/${listing.id}/edit`}
              className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
            >
              Edit Listing
            </a>
          </div>
        </div>
        
        {/* Main content - two column layout on desktop */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Add slot form */}
          <div>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Add Availability Slot
              </h2>
              <AddSlotForm listingId={id} />
            </div>
          </div>
          
          {/* Right: Slot list */}
          <div>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Your Availability
                </h2>
                <span className="text-sm text-slate-600 dark:text-slate-400">
                  {slots.length} {slots.length === 1 ? 'slot' : 'slots'}
                </span>
              </div>
              <SlotList slots={slots} listingId={id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
