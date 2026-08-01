import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { signOutAction } from '@/features/auth/actions'

/**
 * Header: Global navigation header (server component).
 *
 * Features:
 * - Logo → home (/)
 * - "Browse Spaces" → /search
 * - Auth state: Sign in / Sign out
 * - Sign out via form action (server action)
 *
 * Always mounted in app/layout.tsx above <main>.
 */
export async function Header() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="text-xl font-bold text-slate-900 dark:text-white hover:text-primary dark:hover:text-primary transition-colors"
          >
            Quick Reserve
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-6">
            <Link
              href="/search"
              className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors"
            >
              Browse Spaces
            </Link>

            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors"
                >
                  Dashboard
                </Link>
                <form action={signOutAction}>
                  <button
                    type="submit"
                    className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary transition-colors"
              >
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
