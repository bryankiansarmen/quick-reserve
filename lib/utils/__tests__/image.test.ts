import { describe, it, expect } from 'vitest'
import {
  isAllowedImageSrc,
  getFirstAllowedImage,
  filterAllowedImages,
} from '../image'

describe('image URL sanitizer', () => {
  describe('isAllowedImageSrc', () => {
    it('allows local public assets (leading slash)', () => {
      expect(isAllowedImageSrc('/placeholder-listing.svg')).toBe(true)
      expect(isAllowedImageSrc('/images/hero.jpg')).toBe(true)
    })

    it('allows local Supabase storage URLs', () => {
      expect(
        isAllowedImageSrc('http://127.0.0.1:54321/storage/v1/object/public/listing-images/a.jpg'),
      ).toBe(true)
    })

    it('allows *.supabase.co hosts', () => {
      expect(
        isAllowedImageSrc('https://abcdefgh.supabase.co/storage/v1/object/public/listing-images/a.jpg'),
      ).toBe(true)
    })

    it('rejects unconfigured hosts', () => {
      expect(isAllowedImageSrc('https://example.com/first.jpg')).toBe(false)
      expect(isAllowedImageSrc('https://cdn.example.org/photo.png')).toBe(false)
    })

    it('rejects invalid URLs', () => {
      expect(isAllowedImageSrc('not-a-url')).toBe(false)
      expect(isAllowedImageSrc('')).toBe(false)
    })
  })

  describe('getFirstAllowedImage', () => {
    it('returns the first allowed image', () => {
      const images = [
        'https://example.com/first.jpg',
        'http://127.0.0.1:54321/storage/v1/object/public/listing-images/a.jpg',
      ]
      expect(getFirstAllowedImage(images)).toBe(
        'http://127.0.0.1:54321/storage/v1/object/public/listing-images/a.jpg',
      )
    })

    it('falls back to the placeholder when nothing is allowed', () => {
      expect(getFirstAllowedImage(['https://example.com/first.jpg'])).toBe(
        '/placeholder-listing.svg',
      )
      expect(getFirstAllowedImage([])).toBe('/placeholder-listing.svg')
    })
  })

  describe('filterAllowedImages', () => {
    it('drops unconfigured-host URLs and keeps allowed ones', () => {
      const images = [
        'https://example.com/first.jpg',
        '/local.jpg',
        'https://evil.example.org/x.png',
        'https://abcdefgh.supabase.co/storage/v1/object/public/listing-images/a.jpg',
      ]
      expect(filterAllowedImages(images)).toEqual([
        '/local.jpg',
        'https://abcdefgh.supabase.co/storage/v1/object/public/listing-images/a.jpg',
      ])
    })
  })
})
