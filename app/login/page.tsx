import { Suspense } from 'react'
import { LoginForm } from '@/features/auth/components/LoginForm'

export const metadata = {
  title: 'Sign In | Quick Reserve',
  description: 'Sign in to your Quick Reserve account to book venue and event space time slots.',
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
      <Suspense fallback={<div className="text-center text-slate-500">Loading form...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  )
}
