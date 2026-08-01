export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header skeleton */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-10 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="mt-2 h-6 w-96 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
      </header>

      {/* Content skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-pulse">
          {/* Sidebar skeleton */}
          <aside className="lg:col-span-1">
            <div className="h-96 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800" />
          </aside>

          {/* Grid skeleton */}
          <main className="lg:col-span-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800"
                >
                  <div className="aspect-[4/3] bg-slate-200 dark:bg-slate-700" />
                  <div className="p-4 space-y-3">
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
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
