import { describe, it, expect, vi } from 'vitest'
import { signupWithEmail, loginWithEmail } from '../actions'

// Mock next/headers and next/navigation
vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue(new Map([['origin', 'http://localhost:3000']])),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
  }),
}))

describe('Auth Server Actions - Input Validation', () => {
  it('loginWithEmail returns error if email or password missing', async () => {
    const formData = new FormData()
    formData.append('email', 'test@example.com')
    // password missing

    const result = await loginWithEmail(null, formData)
    expect(result).toEqual({ error: 'Email and password are required.' })
  })

  it('signupWithEmail returns error if passwords do not match', async () => {
    const formData = new FormData()
    formData.append('email', 'user@example.com')
    formData.append('password', 'password123')
    formData.append('confirmPassword', 'different456')

    const result = await signupWithEmail(null, formData)
    expect(result).toEqual({ error: 'Passwords do not match.' })
  })

  it('signupWithEmail returns error if password is less than 6 characters', async () => {
    const formData = new FormData()
    formData.append('email', 'user@example.com')
    formData.append('password', '12345')
    formData.append('confirmPassword', '12345')

    const result = await signupWithEmail(null, formData)
    expect(result).toEqual({ error: 'Password must be at least 6 characters long.' })
  })
})
