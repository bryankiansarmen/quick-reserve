export default function BuyerBookingsLoading() {
  return (
    <main className="min-h-screen bg-slate-50 p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-8 animate-pulse">
        {/* Header skeleton */}
        <header>
          <div className="mb-1 h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="h-9 w-48 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="mt-2 h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded" />
        </header>

        {/* Upcoming section skeleton */}
        <section>
          <div className="mb-4 h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={`upcoming-${i}`}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start gap-4">
                  <div className="h-24 w-24 shrink-0 rounded-lg bg-slate-200 dark:bg-slate-700 sm:h-28 sm:w-28" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Past section skeleton */}
        <section>
          <div className="mb-4 h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
          <div className="space-y-3">
            {Array.from({ length: 1 }).map((_, i) => (
              <div
                key={`past-${i}`}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start gap-4">
                  <div className="h-24 w-24 shrink-0 rounded-lg bg-slate-200 dark:bg-slate-700 sm:h-28 sm:w-28" />
                  <div className="flex-1 space-y-3">
                    <div className="h-5 w-2/3 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-4 w-1/3 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-4 w-1/2 bg-slate-200 dark:bg-slate-700 rounded" />
                    <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
