'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { filterAllowedImages } from '@/lib/utils/image'

interface ImageGalleryProps {
  images: string[]
  title: string
}

/**
 * ImageGallery: Interactive image carousel for listing detail page.
 *
 * Features:
 * - Hero image display (16:9 aspect ratio on desktop, 4:3 on mobile)
 * - Thumbnail strip with click-to-switch
 * - Keyboard navigation (Arrow Left/Right, Home, End)
 * - Single image fallback (no thumbnails if only 1 image)
 * - Lazy loading of thumbnails
 * - Placeholder image if no images provided
 *
 * Accessibility:
 * - Semantic HTML with role="img" on hero
 * - ARIA labels for navigation
 * - Keyboard events properly handled
 * - Focus management
 */
export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const safeImages = filterAllowedImages(images)
  const displayImages = safeImages.length > 0 ? safeImages : ['/placeholder-listing.svg']
  const showThumbnails = displayImages.length > 1

  // Navigate to specific image
  const goToImage = useCallback((index: number) => {
    const newIndex = Math.max(0, Math.min(index, displayImages.length - 1))
    setActiveIndex(newIndex)
  }, [displayImages.length])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          goToImage(activeIndex - 1)
          break
        case 'ArrowRight':
          e.preventDefault()
          goToImage(activeIndex + 1)
          break
        case 'Home':
          e.preventDefault()
          goToImage(0)
          break
        case 'End':
          e.preventDefault()
          goToImage(displayImages.length - 1)
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, displayImages.length, goToImage])

  return (
    <div className="w-full space-y-4">
      {/* Hero Image */}
      <div
        className="relative aspect-[16/9] sm:aspect-[4/3] md:aspect-[16/9] bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-hidden"
        role="img"
        aria-label={`${title} - image ${activeIndex + 1} of ${displayImages.length}`}
      >
        <Image
          src={displayImages[activeIndex]}
          alt={`${title} - view ${activeIndex + 1}`}
          fill
          className="object-cover"
          priority={activeIndex === 0}
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 66vw, (max-width: 1280px) 50vw, 100vw"
        />

        {/* Image counter badge */}
        {showThumbnails && (
          <div className="absolute top-4 right-4 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
            {activeIndex + 1} / {displayImages.length}
          </div>
        )}

        {/* Navigation arrows (visible on hover for desktop) */}
        {showThumbnails && (
          <>
            <button
              onClick={() => goToImage(activeIndex - 1)}
              disabled={activeIndex === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-white/80 dark:bg-neutral-800/80 hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors z-10"
              aria-label="Previous image"
              title="Previous image (or press Left Arrow)"
            >
              <svg
                className="w-6 h-6 text-neutral-900 dark:text-neutral-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <button
              onClick={() => goToImage(activeIndex + 1)}
              disabled={activeIndex === displayImages.length - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-white/80 dark:bg-neutral-800/80 hover:bg-white dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors z-10"
              aria-label="Next image"
              title="Next image (or press Right Arrow)"
            >
              <svg
                className="w-6 h-6 text-neutral-900 dark:text-neutral-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Thumbnail Strip */}
      {showThumbnails && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {displayImages.map((image, index) => (
            <button
              key={index}
              onClick={() => goToImage(index)}
              className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                index === activeIndex
                  ? 'border-primary ring-2 ring-primary ring-offset-1 dark:ring-offset-neutral-900'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
              }`}
              aria-label={`View image ${index + 1}`}
              aria-current={index === activeIndex ? 'page' : undefined}
            >
              <Image
                src={image}
                alt={`${title} - thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Keyboard help text (subtle) */}
      {showThumbnails && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
          Use arrow keys or click thumbnails to browse
        </p>
      )}
    </div>
  )
}
