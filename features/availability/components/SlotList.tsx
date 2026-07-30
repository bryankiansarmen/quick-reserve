'use client'

import { useState } from 'react'
import { deleteSlotAction } from '../actions'
import { formatTimeRange, formatDuration } from '@/features/listings/validation'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import type { AvailabilitySlot } from '@/features/listings/types'

interface SlotListProps {
  slots: AvailabilitySlot[]
  listingId: string
}

export function SlotList({ slots, listingId }: SlotListProps) {
  const [deletingSlotId, setDeletingSlotId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDeleteClick = (slotId: string) => {
    setDeletingSlotId(slotId)
    setError(null)
  }

  const handleConfirmDelete = async () => {
    if (!deletingSlotId) return

    setIsDeleting(true)
    const result = await deleteSlotAction(listingId, deletingSlotId)
    setIsDeleting(false)

    if (result.errors?.general) {
      setError(result.errors.general[0])
      setDeletingSlotId(null)
    } else if (result.success) {
      setDeletingSlotId(null)
    }
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 dark:bg-slate-900 rounded-lg">
        <p className="text-slate-600 dark:text-slate-400">
          No availability slots yet. Add your first slot below.
        </p>
      </div>
    )
  }

  return (
    <>
      {error && (
        <div
          className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <caption className="sr-only">
            Availability slots for this listing
          </caption>
          <thead className="border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                Date & Time
              </th>
              <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                Duration
              </th>
              <th scope="col" className="text-left py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                Status
              </th>
              <th scope="col" className="text-right py-3 px-4 text-sm font-medium text-slate-700 dark:text-slate-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {slots.map((slot) => (
              <tr key={slot.id}>
                <td className="py-3 px-4 text-sm text-slate-900 dark:text-white">
                  {formatTimeRange(slot.start_time, slot.end_time)}
                </td>
                <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">
                  {formatDuration(slot.start_time, slot.end_time)}
                </td>
                <td className="py-3 px-4">
                  {slot.is_booked ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                      Booked
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                      Available
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(slot.id)}
                    disabled={slot.is_booked}
                    className="text-sm text-red-600 hover:text-red-500 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
                    aria-label={`Delete slot on ${formatTimeRange(slot.start_time, slot.end_time)}`}
                    title={slot.is_booked ? 'Cannot delete booked slot' : 'Delete slot'}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        isOpen={deletingSlotId !== null}
        title="Delete Availability Slot?"
        message="This action cannot be undone. The time slot will be permanently removed from your listing."
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete'}
        cancelLabel="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingSlotId(null)}
        isDestructive={true}
      />
    </>
  )
}
