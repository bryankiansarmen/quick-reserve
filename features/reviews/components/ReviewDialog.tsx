'use client'

import { useEffect, useState } from 'react'

const MAX_COMMENT_LENGTH = 1000

const STAR_VALUES = [1, 2, 3, 4, 5] as const

interface ReviewDialogProps {
  bookingId: string
  listingTitle: string
  isOpen: boolean
  onClose: () => void
  onSubmitted: () => void
}

/**
 * ReviewDialog: modal for submitting a rating + comment for a completed
 * booking.
 *
 * Client component — posts to `POST /api/reviews`, shows inline errors and locks the dialog
 * while the request is in flight so a review can't be double-submitted.
 * Dismissible via Escape and backdrop click (except mid-submit), matching the
 * design system's dialog conventions.
 */
export function ReviewDialog({
  bookingId,
  listingTitle,
  isOpen,
  onClose,
  onSubmitted,
}: ReviewDialogProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined>>({})

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) return null

  function handleRatingChange(value: number) {
    setRating(value)
    setFieldErrors((prev) => ({ ...prev, rating: undefined }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})

    if (rating < 1) {
      setFieldErrors({ rating: ['Please select a rating.'] })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          rating,
          comment: comment.trim() || undefined,
        }),
      })

      const data = (await response.json().catch(() => null)) as {
        error?: { code?: string; message?: string; details?: Record<string, string[]> }
      } | null

      if (!response.ok) {
        const code = data?.error?.code
        if (code === 'REVIEW_ALREADY_EXISTS') {
          setError('You have already reviewed this booking.')
        } else if (code === 'BOOKING_NOT_COMPLETED') {
          setError('This booking is not yet eligible for a review.')
        } else if (code === 'VALIDATION_ERROR') {
          const details = data?.error?.details
          if (details && Object.keys(details).length > 0) {
            setFieldErrors(details)
          } else {
            setError(data?.error?.message ?? 'Please fix the issues above.')
          }
        } else {
          setError(data?.error?.message ?? 'Something went wrong. Please try again.')
        }
        return
      }

      onSubmitted()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={isSubmitting ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-dialog-title"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="review-dialog-title"
          className="text-lg font-semibold text-slate-900 dark:text-white"
        >
          Review {listingTitle}
        </h2>

        <form onSubmit={handleSubmit} noValidate>
          {/* Rating */}
          <fieldset className="mt-4">
            <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Your rating
            </legend>
            <div className="mt-2 flex gap-1" role="radiogroup" aria-label="Rating">
              {STAR_VALUES.map((value) => {
                const filled = value <= (hoverRating || rating)
                return (
                  <label key={value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="rating"
                      value={value}
                      checked={rating === value}
                      onChange={() => handleRatingChange(value)}
                      className="sr-only"
                      aria-label={`${value} star${value === 1 ? '' : 's'}`}
                    />
                    <span
                      className={`text-2xl transition-colors ${
                        filled
                          ? 'text-amber-400'
                          : 'text-slate-300 dark:text-slate-600'
                      }`}
                      onMouseEnter={() => setHoverRating(value)}
                      onMouseLeave={() => setHoverRating(0)}
                      aria-hidden="true"
                    >
                      ★
                    </span>
                  </label>
                )
              })}
            </div>
            {fieldErrors.rating && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.rating[0]}</p>
            )}
          </fieldset>

          {/* Comment */}
          <div className="mt-4">
            <label
              htmlFor="review-comment"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Your review <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              id="review-comment"
              rows={4}
              maxLength={MAX_COMMENT_LENGTH}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
            <p className="mt-1 text-right text-xs text-slate-400">
              {comment.length}/{MAX_COMMENT_LENGTH}
            </p>
            {fieldErrors.comment && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.comment[0]}</p>
            )}
          </div>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300" role="alert">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Submitting…' : 'Submit review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
