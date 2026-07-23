import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signOutAction } from '@/features/auth/actions'

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

  return (
    <main className="min-h-screen bg-slate-50 p-8 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-center justify-between border-b border-slate-200 pb-6 dark:border-slate-800">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Manage your Quick Reserve account and activity
            </p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              id="signout-btn"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Sign out
            </button>
          </form>
        </header>

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
          </div>
        </section>
      </div>
    </main>
  )
}
