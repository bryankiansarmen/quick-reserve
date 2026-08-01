'use client'

import { useActionState, useState } from 'react'
import { addSlotAction } from '../actions'
import { formatTimeRange, formatDuration } from '@/features/listings/validation'
import type { SlotActionState } from '@/features/listings/types'

interface AddSlotFormProps {
  listingId: string
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return (
    <p className="mt-1 text-xs text-red-600 dark:text-red-400" aria-live="polite">
      {messages[0]}
    </p>
  )
}

const inputBase =
  'mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 ' +
  'placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 ' +
  'dark:bg-slate-800 dark:text-white dark:placeholder-slate-500'

const inputNormal =
  inputBase +
  ' border-slate-300 focus:border-primary focus:ring-primary dark:border-slate-700'

const inputError =
  inputBase +
  ' border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-500'

function inputClass(hasError: boolean) {
  return hasError ? inputError : inputNormal
}

export function AddSlotForm({ listingId }: AddSlotFormProps) {
  const [state, formAction, isPending] = useActionState<SlotActionState | null, FormData>(
    addSlotAction,
    null
  )

  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [prevSuccessState, setPrevSuccessState] = useState(false)

  if (state?.success && !prevSuccessState) {
    setPrevSuccessState(true)
    setShowSuccess(true)
    setStartTime('')
    setEndTime('')
    setTimeout(() => {
      setShowSuccess(false)
    }, 3000)
  } else if (!state?.success && prevSuccessState) {
    setPrevSuccessState(false)
  }

  const handleStartTimeChange = (value: string) => {
    setStartTime(value)
    if (value) {
      const [datePart, timePart] = value.split('T')
      const [hours, minutes] = timePart.split(':')

      const start = new Date(datePart)
      start.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0)

      const end = new Date(start.getTime() + 60 * 60 * 1000)

      const year = end.getFullYear()
      const month = String(end.getMonth() + 1).padStart(2, '0')
      const date = String(end.getDate()).padStart(2, '0')
      const endHours = String(end.getHours()).padStart(2, '0')
      const endMinutes = String(end.getMinutes()).padStart(2, '0')

      const endISO = `${year}-${month}-${date}T${endHours}:${endMinutes}`
      setEndTime(endISO)
    }
  }

  const errors = state?.errors ?? {}

  const now = new Date()
  const minDateTime = now.toISOString().slice(0, 16)

  const durationPreview = startTime && endTime
    ? formatDuration(startTime, endTime)
    : null

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <input type="hidden" name="listing_id" value={listingId} />

      {showSuccess && (
        <div className="rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-950/20 px-4 py-3 animate-in fade-in duration-300">
          <div className="flex gap-3">
            <svg
              className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm font-medium text-green-900 dark:text-green-200">
              Slot added successfully!
            </p>
          </div>
        </div>
      )}

      {errors.overlap && (
        <div className="rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
          <div className="flex gap-3">
            <svg
              className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium text-amber-900 dark:text-amber-200">
                Slot Overlap Detected
              </p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
                {errors.overlap[0]}
              </p>
              {state?.conflictingSlot && (
                <p className="mt-2 text-sm text-amber-700 dark:text-amber-300 font-medium">
                  Conflicts with: {formatTimeRange(
                    state.conflictingSlot.start_time,
                    state.conflictingSlot.end_time
                  )}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {errors.general && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-300" role="alert">
          {errors.general[0]}
        </div>
      )}

      <div>
        <label htmlFor="start_time" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Start time <span className="text-red-500">*</span>
        </label>
        <input
          id="start_time"
          name="start_time"
          type="datetime-local"
          required
          min={minDateTime}
          value={startTime}
          onChange={(e) => handleStartTimeChange(e.target.value)}
          className={inputClass(!!errors.start_time)}
          aria-describedby={errors.start_time ? 'start-time-error' : undefined}
        />
        {errors.start_time && <FieldError messages={errors.start_time} />}
      </div>

      <div>
        <label htmlFor="end_time" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          End time <span className="text-red-500">*</span>
        </label>
        <input
          id="end_time"
          name="end_time"
          type="datetime-local"
          required
          min={startTime || minDateTime}
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className={inputClass(!!errors.end_time)}
          aria-describedby={errors.end_time ? 'end-time-error' : undefined}
        />
        {errors.end_time && <FieldError messages={errors.end_time} />}

        {durationPreview && (
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Duration: {durationPreview}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isPending && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {isPending ? 'Adding slot...' : 'Add Slot'}
      </button>
    </form>
  )
}
