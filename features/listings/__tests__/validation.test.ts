import { describe, it, expect } from 'vitest'
import { listingSchema, dollarsToCents, validateImageFile, getPublishValidationErrors } from '../validation'

/** A fully valid listing payload for boundary testing. */
const validPayload = {
  title: 'Test Listing',
  description: 'A nice space.',
  category: 'photography-studio' as const,
  price_cents: 5000,
  location: 'Test City',
  booking_mode: 'instant' as const,
}

describe('listingSchema', () => {
  it('accepts a fully valid payload', () => {
    const result = listingSchema.safeParse(validPayload)
    expect(result.success).toBe(true)
  })

  it('accepts a payload without optional description', () => {
    const withoutDesc = { ...validPayload, description: undefined }
    const result = listingSchema.safeParse(withoutDesc)
    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    const result = listingSchema.safeParse({ ...validPayload, title: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.title).toBeDefined()
    }
  })

  it('rejects title longer than 100 characters', () => {
    const longTitle = 'A'.repeat(101)
    const result = listingSchema.safeParse({ ...validPayload, title: longTitle })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.title).toBeDefined()
    }
  })

  it('accepts title exactly 100 characters', () => {
    const maxTitle = 'A'.repeat(100)
    const result = listingSchema.safeParse({ ...validPayload, title: maxTitle })
    expect(result.success).toBe(true)
  })

  it('rejects price_cents = 0', () => {
    const result = listingSchema.safeParse({ ...validPayload, price_cents: 0 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.price_cents).toBeDefined()
    }
  })

  it('rejects negative price_cents', () => {
    const result = listingSchema.safeParse({ ...validPayload, price_cents: -100 })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.price_cents).toBeDefined()
    }
  })

  it('accepts price_cents = 1 (minimum valid)', () => {
    const result = listingSchema.safeParse({ ...validPayload, price_cents: 1 })
    expect(result.success).toBe(true)
  })

  it('rejects invalid category', () => {
    const result = listingSchema.safeParse({ ...validPayload, category: 'parking-lot' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.category).toBeDefined()
    }
  })

  it('accepts all valid categories', () => {
    const categories = ['photography-studio', 'event-venue', 'meeting-room', 'activity-space'] as const
    for (const category of categories) {
      const result = listingSchema.safeParse({ ...validPayload, category })
      expect(result.success).toBe(true)
    }
  })

  it('rejects invalid booking_mode', () => {
    const result = listingSchema.safeParse({ ...validPayload, booking_mode: 'auction' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.booking_mode).toBeDefined()
    }
  })

  it('accepts both valid booking modes', () => {
    for (const booking_mode of ['instant', 'request'] as const) {
      const result = listingSchema.safeParse({ ...validPayload, booking_mode })
      expect(result.success).toBe(true)
    }
  })

  it('rejects empty location', () => {
    const result = listingSchema.safeParse({ ...validPayload, location: '' })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.location).toBeDefined()
    }
  })

  it('rejects description longer than 2000 characters', () => {
    const longDesc = 'A'.repeat(2001)
    const result = listingSchema.safeParse({ ...validPayload, description: longDesc })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.description).toBeDefined()
    }
  })

  it('accepts description exactly 2000 characters', () => {
    const maxDesc = 'A'.repeat(2000)
    const result = listingSchema.safeParse({ ...validPayload, description: maxDesc })
    expect(result.success).toBe(true)
  })

  it('accepts valid image URLs', () => {
    const images = ['https://example.com/photo1.jpg', 'https://example.com/photo2.png']
    const result = listingSchema.safeParse({ ...validPayload, images })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.images).toEqual(images)
    }
  })

  it('rejects invalid image URLs', () => {
    const images = ['not-a-url']
    const result = listingSchema.safeParse({ ...validPayload, images })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.images).toBeDefined()
    }
  })

  it('rejects more than 10 images', () => {
    const images = Array.from({ length: 11 }, (_, i) => `https://example.com/img${i}.jpg`)
    const result = listingSchema.safeParse({ ...validPayload, images })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.images).toBeDefined()
    }
  })
})

describe('dollarsToCents', () => {
  it('converts "85.00" to 8500', () => {
    expect(dollarsToCents('85.00')).toBe(8500)
  })

  it('converts "1" to 100', () => {
    expect(dollarsToCents('1')).toBe(100)
  })

  it('converts "0.01" to 1', () => {
    expect(dollarsToCents('0.01')).toBe(1)
  })

  it('converts "0.00" to 0', () => {
    expect(dollarsToCents('0.00')).toBe(0)
  })

  it('returns null for non-numeric string', () => {
    expect(dollarsToCents('abc')).toBeNull()
  })

  it('returns null for negative value', () => {
    expect(dollarsToCents('-5')).toBeNull()
  })

  it('rounds half-cents correctly', () => {
    // "85.555" rounds to 8556
    expect(dollarsToCents('85.555')).toBe(8556)
  })
})

describe('validateImageFile', () => {
  it('accepts valid image MIME types under 5MB', () => {
    const validFile = new File(['dummy content'], 'photo.jpg', { type: 'image/jpeg' })
    expect(validateImageFile(validFile)).toEqual({ valid: true })
  })

  it('rejects non-image MIME types', () => {
    const pdfFile = new File(['dummy content'], 'doc.pdf', { type: 'application/pdf' })
    const res = validateImageFile(pdfFile)
    expect(res.valid).toBe(false)
    expect(res.error).toContain('File type is not supported')
  })

  it('rejects files larger than 5MB', () => {
    const largeBlob = new Uint8Array(5 * 1024 * 1024 + 1)
    const largeFile = new File([largeBlob], 'big.png', { type: 'image/png' })
    const res = validateImageFile(largeFile)
    expect(res.valid).toBe(false)
    expect(res.error).toContain('exceeds the 5MB limit')
  })
})

describe('getPublishValidationErrors', () => {
  it('returns error if images count is below minimum', () => {
    const errors = getPublishValidationErrors(0)
    expect(errors).toContain('Add at least 1 image before publishing')
  })

  it('returns empty array if minimum images met', () => {
    const errors = getPublishValidationErrors(1)
    expect(errors).toHaveLength(0)
  })

  it('returns empty array for multiple images', () => {
    const errors = getPublishValidationErrors(5)
    expect(errors).toHaveLength(0)
  })

  it('returns empty array for maximum images', () => {
    const errors = getPublishValidationErrors(10)
    expect(errors).toHaveLength(0)
  })
})

