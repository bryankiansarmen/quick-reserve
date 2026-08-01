import { describe, it, expect, vi } from 'vitest'
import { signupWithEmail, loginWithEmail } from '../actions'
import { createClient } from '@/lib/supabase/server'

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

  it('signupWithEmail returns error if full name is missing', async () => {
    const formData = new FormData()
    formData.append('email', 'user@example.com')
    formData.append('password', 'password123')
    formData.append('confirmPassword', 'password123')

    const result = await signupWithEmail(null, formData)
    expect(result).toEqual({ error: 'Full name is required.' })
  })

  it('signupWithEmail returns error if passwords do not match', async () => {
    const formData = new FormData()
    formData.append('email', 'user@example.com')
    formData.append('password', 'password123')
    formData.append('confirmPassword', 'different456')
    formData.append('fullName', 'Jane Doe')

    const result = await signupWithEmail(null, formData)
    expect(result).toEqual({ error: 'Passwords do not match.' })
  })

  it('signupWithEmail returns error if password is less than 6 characters', async () => {
    const formData = new FormData()
    formData.append('email', 'user@example.com')
    formData.append('password', '12345')
    formData.append('confirmPassword', '12345')
    formData.append('fullName', 'Jane Doe')

    const result = await signupWithEmail(null, formData)
    expect(result).toEqual({ error: 'Password must be at least 6 characters long.' })
  })

  it('signupWithEmail passes full_name in user metadata', async () => {
    const mockClient = await createClient()
    const signUpMock = mockClient.auth.signUp as ReturnType<typeof vi.fn>
    signUpMock.mockResolvedValueOnce({ data: { user: null, session: null }, error: null })

    const formData = new FormData()
    formData.append('email', 'user@example.com')
    formData.append('password', 'password123')
    formData.append('confirmPassword', 'password123')
    formData.append('fullName', '  Jane Doe  ')

    await signupWithEmail(null, formData)

    expect(signUpMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password123',
      options: {
        data: { full_name: 'Jane Doe' },
        emailRedirectTo: 'http://localhost:3000/auth/callback',
      },
    })
  })
})
