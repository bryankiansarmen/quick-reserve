/**
 * Loading skeleton for listing detail page.
 * Displayed while the page is rendering server-side.
 * Matches the layout structure to minimize CLS (Cumulative Layout Shift).
 */

export default function ListingDetailLoading() {
  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-4">
            <div className="flex-1">
              <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4 mb-4" />
              <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
            </div>

            <div className="text-right">
              <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded w-40 mb-2" />
              <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-32 ml-auto" />
            </div>
          </div>

          {/* Category & Rating */}
          <div className="flex gap-4">
            <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-32" />
            <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-40" />
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-[16/9] sm:aspect-[4/3] md:aspect-[16/9] bg-neutral-200 dark:bg-neutral-700 rounded-lg" />
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="w-20 h-20 bg-neutral-200 dark:bg-neutral-700 rounded-lg" />
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6 space-y-4">
              <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3" />
              <div className="space-y-3">
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-full" />
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-5/6" />
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-4/5" />
              </div>
            </div>

            {/* Availability Calendar */}
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6 space-y-4">
              <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3" />
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded" />
                  <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded" />
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Seller Card */}
          <div className="lg:col-span-1">
            <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-neutral-200 dark:bg-neutral-700 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
                  <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
                </div>
              </div>

              <div className="h-12 bg-neutral-200 dark:bg-neutral-700 rounded" />
              <div className="h-20 bg-neutral-200 dark:bg-neutral-700 rounded" />
              <div className="h-10 bg-neutral-200 dark:bg-neutral-700 rounded" />
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <div className="mb-12 text-center">
          <div className="h-12 bg-neutral-200 dark:bg-neutral-700 rounded w-40 mx-auto" />
        </div>

        {/* Similar Listings */}
        <div>
          <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-1/3 mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-[4/3] bg-neutral-200 dark:bg-neutral-700 rounded-lg" />
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
                <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
