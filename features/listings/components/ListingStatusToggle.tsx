'use client'

import { useState, useTransition } from 'react'
import { updateListingStatusAction } from '../actions'

interface ListingStatusToggleProps {
  listingId: string
  currentStatus: 'draft' | 'published' | 'archived'
  hasImages: boolean
}

export default function ListingStatusToggle({
  listingId,
  currentStatus,
  hasImages,
}: ListingStatusToggleProps) {
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleStatusChange = async (newStatus: 'draft' | 'published' | 'archived') => {
    // Clear any previous error
    setErrorMessage(null)

    if (newStatus === 'archived') {
      const confirmed = window.confirm(
        'Are you sure you want to archive this listing? It will no longer be visible in public search results.'
      )
      if (!confirmed) return
    }

    if (newStatus === 'published' && !hasImages) {
      setErrorMessage('Add at least 1 image before publishing.')
      return
    }

    startTransition(async () => {
      try {
        const result = await updateListingStatusAction(listingId, newStatus)
        if (result.generalError) {
          setErrorMessage(result.generalError)
        }
      } catch {
        setErrorMessage('An unexpected error occurred. Please try again.')
      }
    })
  }

  const renderStatusButton = () => {
    switch (currentStatus) {
      case 'draft':
        return (
          <button
            onClick={() => handleStatusChange('published')}
            disabled={isPending}
            className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
            aria-busy={isPending}
          >
            {isPending ? 'Publishing...' : 'Publish'}
          </button>
        )
      case 'published':
        return (
          <button
            onClick={() => handleStatusChange('archived')}
            disabled={isPending}
            className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-950/20 transition-colors"
            aria-busy={isPending}
          >
            {isPending ? 'Archiving...' : 'Archive'}
          </button>
        )
      case 'archived':
        return (
          <button
            onClick={() => handleStatusChange('published')}
            disabled={isPending}
            className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
            aria-busy={isPending}
          >
            {isPending ? 'Re-publishing...' : 'Re-publish'}
          </button>
        )
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      {renderStatusButton()}
      {errorMessage && (
        <span
          role="alert"
          aria-live="polite"
          className="text-xs font-medium text-red-600 dark:text-red-400 max-w-[200px] text-right"
        >
          {errorMessage}
        </span>
      )}
    </div>
  )
}
