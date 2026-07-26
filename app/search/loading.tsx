export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900">
      {/* Header skeleton */}
      <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-10 w-64 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          <div className="mt-2 h-6 w-96 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>
      </header>

      {/* Content skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-pulse">
          {/* Sidebar skeleton */}
          <aside className="lg:col-span-1">
            <div className="h-96 bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700" />
          </aside>

          {/* Grid skeleton */}
          <main className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-700"
                >
                  <div className="aspect-[4/3] bg-neutral-200 dark:bg-neutral-700" />
                  <div className="p-4 space-y-3">
                    <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-3/4" />
                    <div className="h-4 bg-neutral-200 dark:bg-neutral-700 rounded w-1/2" />
                    <div className="h-6 bg-neutral-200 dark:bg-neutral-700 rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
