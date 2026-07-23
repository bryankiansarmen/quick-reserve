'use client'

import { useActionState } from 'react'
import { createListingAction, updateListingAction, ListingActionState } from '../actions'
import { LISTING_CATEGORIES, BOOKING_MODES, ListingFormValues } from '../validation'

interface ListingFormProps {
  /** When present, the form operates in edit mode. */
  listingId?: string
  /** Pre-populated values for edit mode. */
  initialData?: Partial<ListingFormValues & { price_cents: number }>
}


function centsToDollarString(cents: number): string {
  return (cents / 100).toFixed(2)
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null
  return (
    <p className="mt-1 text-xs text-red-600 dark:text-red-400" aria-live="polite">
      {messages[0]}
    </p>
  )
}

const categoryLabels: Record<string, string> = {
  'photography-studio': 'Photography Studio',
  'event-venue': 'Event Venue',
  'meeting-room': 'Meeting Room',
  'activity-space': 'Activity Space',
}

const inputBase =
  'mt-1 block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 ' +
  'placeholder-slate-400 shadow-sm focus:outline-none focus:ring-2 ' +
  'dark:bg-slate-800 dark:text-white dark:placeholder-slate-500'

const inputNormal =
  inputBase +
  ' border-slate-300 focus:border-indigo-500 focus:ring-indigo-500 dark:border-slate-700'

const inputError =
  inputBase +
  ' border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-500'

function inputClass(hasError: boolean) {
  return hasError ? inputError : inputNormal
}

const labelClass = 'block text-sm font-medium text-slate-700 dark:text-slate-300'

export function ListingForm({ listingId, initialData }: ListingFormProps) {
  const isEdit = !!listingId
  const action = isEdit ? updateListingAction : createListingAction

  const [state, formAction, isPending] = useActionState<ListingActionState | null, FormData>(
    action,
    null
  )

  const errors = state?.errors ?? {}

  const defaultPrice =
    initialData?.price_cents !== undefined
      ? centsToDollarString(initialData.price_cents)
      : ''

  return (
    <form action={formAction} className="space-y-6" noValidate>
      {/* Hidden listing_id for edit mode */}
      {isEdit && <input type="hidden" name="listing_id" value={listingId} />}

      {/* General error */}
      {state?.generalError && (
        <div
          id="listing-form-general-error"
          className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          {state.generalError}
        </div>
      )}

      {/* Title */}
      <div>
        <label htmlFor="title" className={labelClass}>
          Listing title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          maxLength={100}
          required
          autoComplete="off"
          defaultValue={initialData?.title ?? ''}
          placeholder="e.g. Sunlit Photography Studio — Downtown"
          className={inputClass(!!errors.title)}
          aria-describedby={errors.title ? 'title-error' : undefined}
        />
        {errors.title && <FieldError messages={errors.title} />}
      </div>

      {/* Category */}
      <div>
        <label htmlFor="category" className={labelClass}>
          Category <span className="text-red-500">*</span>
        </label>
        <select
          id="category"
          name="category"
          required
          defaultValue={initialData?.category ?? ''}
          className={inputClass(!!errors.category)}
          aria-describedby={errors.category ? 'category-error' : undefined}
        >
          <option value="" disabled>
            Select a category
          </option>
          {LISTING_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {categoryLabels[cat]}
            </option>
          ))}
        </select>
        {errors.category && <FieldError messages={errors.category} />}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className={labelClass}>
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={initialData?.description ?? ''}
          placeholder="Describe your space — amenities, rules, access details…"
          className={inputClass(!!errors.description)}
          aria-describedby={errors.description ? 'description-error' : undefined}
        />
        {errors.description && <FieldError messages={errors.description} />}
      </div>

      {/* Price */}
      <div>
        <label htmlFor="price_dollars" className={labelClass}>
          Price per slot (USD) <span className="text-red-500">*</span>
        </label>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">
            $
          </span>
          <input
            id="price_dollars"
            name="price_dollars"
            type="number"
            min="0.01"
            step="0.01"
            required
            defaultValue={defaultPrice}
            placeholder="0.00"
            className={
              (errors.price_cents ? inputError : inputNormal) + ' pl-7'
            }
            aria-describedby={errors.price_cents ? 'price-error' : undefined}
          />
        </div>
        {errors.price_cents && <FieldError messages={errors.price_cents} />}
      </div>

      {/* Location */}
      <div>
        <label htmlFor="location" className={labelClass}>
          Location <span className="text-red-500">*</span>
        </label>
        <input
          id="location"
          name="location"
          type="text"
          required
          defaultValue={initialData?.location ?? ''}
          placeholder="e.g. Downtown San Francisco, CA"
          className={inputClass(!!errors.location)}
          aria-describedby={errors.location ? 'location-error' : undefined}
        />
        {errors.location && <FieldError messages={errors.location} />}
      </div>

      {/* Booking mode */}
      <fieldset>
        <legend className={labelClass + ' mb-2'}>
          Booking mode <span className="text-red-500">*</span>
        </legend>
        <div className="flex flex-col gap-3 sm:flex-row">
          {BOOKING_MODES.map((mode) => (
            <label
              key={mode}
              className="flex flex-1 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 dark:has-[:checked]:bg-indigo-950/30"
            >
              <input
                type="radio"
                name="booking_mode"
                value={mode}
                defaultChecked={
                  initialData?.booking_mode
                    ? initialData.booking_mode === mode
                    : mode === 'request'
                }
                className="mt-0.5 h-4 w-4 shrink-0 accent-indigo-600"
              />
              <span>
                <span className="block text-sm font-medium text-slate-900 dark:text-white capitalize">
                  {mode === 'instant' ? 'Instant Book' : 'Request to Book'}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                  {mode === 'instant'
                    ? 'Guests can book immediately without waiting for approval'
                    : 'You approve each booking request before it is confirmed'}
                </span>
              </span>
            </label>
          ))}
        </div>
        {errors.booking_mode && <FieldError messages={errors.booking_mode} />}
      </fieldset>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3 border-t border-slate-200 pt-6 dark:border-slate-700">
        <a
          href="/dashboard/listings"
          className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
        >
          Cancel
        </a>
        <button
          id="listing-form-submit-btn"
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
          {isPending
            ? isEdit
              ? 'Saving…'
              : 'Creating…'
            : isEdit
              ? 'Save changes'
              : 'Create listing'}
        </button>
      </div>
    </form>
  )
}
