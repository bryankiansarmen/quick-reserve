'use client'

import { useRouter } from 'next/navigation'
import { ConfirmDialog } from './ConfirmDialog'
import { useState } from 'react'

interface BackButtonProps {
  label?: string
  fallbackHref?: string
  confirmMessage?: string
  confirmTitle?: string
  confirmLabel?: string
  cancelLabel?: string
  className?: string
}

/**
 * BackButton: Client component that navigates back in browser history.
 *
 * Behavior:
 * - Calls router.back() if history exists
 * - Falls back to `fallbackHref` (default: '/search') when history is empty
 * - Optional confirmation dialog before navigating back
 *
 * Props:
 * - label: button text (default: 'Back')
 * - fallbackHref: where to go when no history (default: '/search')
 * - confirmMessage: if set, shows confirm dialog before navigating
 * - confirmTitle/confirmLabel/cancelLabel: dialog customization
 *
 * Styling:
 * - Text-only button with left arrow glyph (CSS, no icon library dependency)
 * - Hover underline
 */
export function BackButton({
  label = 'Back',
  fallbackHref = '/search',
  confirmMessage,
  confirmTitle = 'Confirm Navigation',
  confirmLabel = 'Leave',
  cancelLabel = 'Stay',
  className = '',
}: BackButtonProps) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)

  function handleClick() {
    if (confirmMessage) {
      setShowConfirm(true)
      return
    }
    performNavigation()
  }

  function performNavigation() {
    // Check if there's history to go back to
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
    } else {
      router.push(fallbackHref)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-primary dark:hover:text-primary hover:underline transition-colors ${className}`}
      >
        <span aria-hidden="true" className="text-lg leading-none">
          ←
        </span>
        {label}
      </button>

      {confirmMessage && (
        <ConfirmDialog
          isOpen={showConfirm}
          title={confirmTitle}
          message={confirmMessage}
          confirmLabel={confirmLabel}
          cancelLabel={cancelLabel}
          onConfirm={() => {
            setShowConfirm(false)
            performNavigation()
          }}
          onCancel={() => setShowConfirm(false)}
          isDestructive={false}
        />
      )}
    </>
  )
}
