import { describe, it, expect } from 'vitest'
import { createBookingSchema } from '../validation'

const VALID_UUID_A = '550e8400-e29b-41d4-a716-446655440000'
const VALID_UUID_B = '550e8400-e29b-41d4-a716-446655440001'

describe('createBookingSchema', () => {
  it('accepts valid listing_id and slot_id UUIDs', () => {
    const result = createBookingSchema.safeParse({
      listing_id: VALID_UUID_A,
      slot_id: VALID_UUID_B,
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing listing_id', () => {
    const result = createBookingSchema.safeParse({
      slot_id: VALID_UUID_B,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('listing_id')
    }
  })

  it('rejects missing slot_id', () => {
    const result = createBookingSchema.safeParse({
      listing_id: VALID_UUID_A,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('slot_id')
    }
  })

  it('rejects invalid listing_id format', () => {
    const result = createBookingSchema.safeParse({
      listing_id: 'not-a-uuid',
      slot_id: VALID_UUID_B,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages.some((m) => m.toLowerCase().includes('uuid'))).toBe(true)
    }
  })

  it('rejects invalid slot_id format', () => {
    const result = createBookingSchema.safeParse({
      listing_id: VALID_UUID_A,
      slot_id: 'not-a-uuid',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message)
      expect(messages.some((m) => m.toLowerCase().includes('uuid'))).toBe(true)
    }
  })

  it('rejects empty object', () => {
    const result = createBookingSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('rejects null body', () => {
    const result = createBookingSchema.safeParse(null)
    expect(result.success).toBe(false)
  })

  it('strips extra fields by default', () => {
    const result = createBookingSchema.safeParse({
      listing_id: VALID_UUID_A,
      slot_id: VALID_UUID_B,
      extra_field: 'should be ignored',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('extra_field')
    }
  })

  it('rejects numeric UUIDs', () => {
    const result = createBookingSchema.safeParse({
      listing_id: 12345,
      slot_id: VALID_UUID_B,
    })
    expect(result.success).toBe(false)
  })
})
