/**
 * Checkout page loading skeleton — mirrors the final layout to avoid layout shift.
 */
export default function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="h-9 bg-neutral-200 dark:bg-neutral-700 rounded w-72 mb-8 animate-pulse" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment form skeleton */}
          <div className="lg:col-span-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-6 sm:p-8">
            <div className="h-7 bg-neutral-200 dark:bg-neutral-700 rounded w-48 mb-6 animate-pulse" />
            <div className="h-12 bg-neutral-200 dark:bg-neutral-700 rounded mb-4 animate-pulse" />
            <div className="h-12 bg-neutral-200 dark:bg-neutral-700 rounded mb-4 animate-pulse" />
            <div className="h-12 bg-neutral-200 dark:bg-neutral-700 rounded mb-6 animate-pulse" />
            <div className="h-12 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>

          {/* Order summary skeleton */}
          <div className="lg:col-span-1 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 overflow-hidden">
            <div className="aspect-[4/3] bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
            <div className="p-6 space-y-4">
              <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2 animate-pulse" />
              <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-2/3 animate-pulse" />
              <div className="border-t border-neutral-200 dark:border-neutral-700 pt-4">
                <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
