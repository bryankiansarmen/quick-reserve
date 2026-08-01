'use client'

import { formatTimeRange, formatAvailabilityDate, groupSlotsByDate } from '@/lib/utils/time'
import type { AvailabilitySlot } from '../types'

interface AvailabilityCalendarProps {
  slots: AvailabilitySlot[]
  totalSlots?: number // Total slots for this listing (booked + available)
  selectedSlotId?: string | null // ID of the currently selected slot
  onSlotSelect?: (slotId: string) => void // Called when an available slot is clicked
}

/**
 * AvailabilityCalendar: Display available time slots grouped by date.
 *
 * Features:
 * - Groups slots by date in chronological order
 * - Formats dates as "Monday, July 28"
 * - Displays time ranges using user's locale
 * - Visual distinction for booked vs available slots
 * - Empty state message distinguishes between "no slots" vs "all booked"
 * - Responsive layout
 * - Optional interactive slot selection (when `onSlotSelect` is provided)
 *
 * Used in:
 * - Listing detail page
 */
export function AvailabilityCalendar({
  slots,
  totalSlots = 0,
  selectedSlotId = null,
  onSlotSelect,
}: AvailabilityCalendarProps) {
  if (!slots || slots.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-8 text-center">
        <p className="text-slate-600 dark:text-slate-400">
          {totalSlots > 0
            ? 'All upcoming slots for the next 30 days are currently booked. Check back soon!'
            : 'No upcoming availability for the next 30 days'}
        </p>
      </div>
    )
  }

  const slotsByDate = groupSlotsByDate(slots)

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
        Availability
      </h2>

      <div className="space-y-4">
        {Array.from(slotsByDate.entries()).map(([dateStr, dateSlots]) => (
          <div key={dateStr} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            {/* Date header */}
            <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {formatAvailabilityDate(dateStr, 'long')}
              </h3>
            </div>

            {/* Time slots for this date */}
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {dateSlots.map((slot, index) => {
                const isSelected = selectedSlotId === slot.id
                const isSelectable = !slot.is_booked && onSlotSelect
                const isFirstSlot = index === 0
                const isLastSlot = index === dateSlots.length - 1

                const rowContent = (
                  <>
                    {/* Time range */}
                    <span className="text-slate-900 dark:text-slate-50 font-medium">
                      {formatTimeRange(slot.start_time, slot.end_time)}
                    </span>

                    {/* Status badge */}
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        slot.is_booked
                          ? 'bg-slate-300 dark:bg-slate-600 text-slate-700 dark:text-slate-200'
                          : isSelected
                            ? 'bg-primary text-white'
                            : 'bg-success/10 dark:bg-success/20 text-success'
                      }`}
                    >
                      {slot.is_booked ? 'Booked' : 'Available'}
                    </span>
                  </>
                )

                const rowClassName = `px-4 py-3 flex items-center justify-between transition-colors ${
                  slot.is_booked
                    ? 'bg-slate-50 dark:bg-slate-800 opacity-60'
                    : ''
                }`

                if (isSelectable) {
                  // Determine border radius based on position
                  const getBorderRadius = () => {
                    if (isFirstSlot && isLastSlot) return '0 0 1rem 1rem' // Only slot
                    if (isFirstSlot) return '0' // First slot - no radius (header has top radius)
                    if (isLastSlot) return '0 0 1rem 1rem' // Last slot - bottom radius
                    return '0' // Middle slots - no radius
                  }

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => onSlotSelect(slot.id)}
                      aria-pressed={isSelected}
                      aria-label={`Select ${formatTimeRange(slot.start_time, slot.end_time)}`}
                      className={`${rowClassName} w-full text-left cursor-pointer transition-all focus:outline-none ${
                        isSelected 
                          ? 'bg-primary/10 dark:bg-primary/20 shadow-[inset_0_0_0_2px_rgb(37_99_235)] dark:shadow-[inset_0_0_0_2px_rgb(37_99_235)]' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                      style={isSelected ? { borderRadius: getBorderRadius() } : undefined}
                    >
                      {rowContent}
                    </button>
                  )
                }

                return (
                  <div key={slot.id} className={rowClassName}>
                    {rowContent}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
