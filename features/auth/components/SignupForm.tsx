'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { signupWithEmail, loginWithGoogle } from '../actions'

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signupWithEmail, null)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      await loginWithGoogle()
    } catch {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white/80 p-8 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Create an account
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Get started with Quick Reserve today
        </p>
      </div>

      {state?.error && (
        <div
          id="signup-error-alert"
          className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300"
          role="alert"
        >
          {state.error}
        </div>
      )}

      {state?.success && (
        <div
          id="signup-success-alert"
          className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
          role="status"
        >
          {state.success}
        </div>
      )}

      <button
        type="button"
        id="google-signup-btn"
        onClick={handleGoogleLogin}
        disabled={googleLoading || isPending}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        {googleLoading ? 'Redirecting to Google...' : 'Sign up with Google'}
      </button>

      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-800" />
        </div>
        <div className="relative bg-white px-3 text-xs uppercase text-slate-500 dark:bg-slate-900 dark:text-slate-400">
          Or sign up with email
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <label
            htmlFor="fullName"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Full name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            required
            placeholder="Jane Doe"
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
          />
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-slate-700 dark:text-slate-300"
          >
            Confirm Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:placeholder-slate-500"
          />
        </div>

        <button
          type="submit"
          id="signup-submit-btn"
          disabled={isPending || googleLoading}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="text-center text-sm text-slate-600 dark:text-slate-400">
        Already have an account?{' '}
        <Link
          href="/login"
          id="login-link"
          className="font-semibold text-primary hover:text-primary-dark dark:text-primary"
        >
          Sign in
        </Link>
      </div>
    </div>
  )
}
