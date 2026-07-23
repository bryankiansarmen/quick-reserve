import { Suspense } from 'react'
import { SignupForm } from '@/features/auth/components/SignupForm'

export const metadata = {
  title: 'Sign Up | Quick Reserve',
  description: 'Create a Quick Reserve account to list or book venue and space time slots.',
}

export default function SignupPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <Suspense fallback={<div className="text-center text-slate-500">Loading form...</div>}>
        <SignupForm />
      </Suspense>
    </main>
  )
}
