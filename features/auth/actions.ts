'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

/**
 * Validates that a redirect path is safe (relative, no double slashes)
 * Prevents open redirect vulnerabilities
 */
function isValidRedirectPath(path: string): boolean {
  return typeof path === 'string' && path.startsWith('/') && !path.includes('//')
}

/**
 * Gets the origin from request headers with fallback
 * Provides a safe default when Origin header is missing
 */
async function getSafeOrigin(): Promise<string> {
  const requestHeaders = await headers()
  const origin = requestHeaders.get('origin')
  return origin || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

export async function loginWithEmail(prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const rawRedirectTo = formData.get('redirectTo') as string
  const redirectTo = (rawRedirectTo && isValidRedirectPath(rawRedirectTo)) ? rawRedirectTo : '/dashboard'

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect(redirectTo)
}

export async function signupWithEmail(prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string
  const fullName = (formData.get('fullName') as string)?.trim()

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  if (!fullName) {
    return { error: 'Full name is required.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' }
  }

  const origin = await getSafeOrigin()
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (data?.user && data.session) {
    redirect('/dashboard')
  }

  return { success: 'Check your email for the confirmation link to complete your signup.' }
}

export async function loginWithGoogle() {
  const origin = await getSafeOrigin()
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (!data?.url) {
    return { error: 'Failed to initiate OAuth flow. Please try again.' }
  }

  redirect(data.url)
}

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
