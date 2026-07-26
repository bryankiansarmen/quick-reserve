import { formatTimeRange, formatAvailabilityDate, groupSlotsByDate } from '@/lib/utils/time'
import type { AvailabilitySlot } from '../types'

interface AvailabilityCalendarProps {
  slots: AvailabilitySlot[]
  totalSlots?: number // Total slots for this listing (booked + available)
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
 *
 * Used in:
 * - Listing detail page
 */
export function AvailabilityCalendar({ slots, totalSlots = 0 }: AvailabilityCalendarProps) {
  if (!slots || slots.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 p-8 text-center">
        <p className="text-neutral-600 dark:text-neutral-400">
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
      <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50">
        Availability
      </h2>

      <div className="space-y-4">
        {Array.from(slotsByDate.entries()).map(([dateStr, dateSlots]) => (
          <div key={dateStr} className="rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
            {/* Date header */}
            <div className="bg-neutral-50 dark:bg-neutral-800 px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-50">
                {formatAvailabilityDate(dateStr, 'long')}
              </h3>
            </div>

            {/* Time slots for this date */}
            <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
              {dateSlots.map(slot => (
                <div
                  key={slot.id}
                  className={`px-4 py-3 flex items-center justify-between ${
                    slot.is_booked
                      ? 'bg-neutral-100 dark:bg-neutral-700 opacity-60'
                      : 'bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750'
                  }`}
                >
                  {/* Time range */}
                  <span className="text-neutral-900 dark:text-neutral-50 font-medium">
                    {formatTimeRange(slot.start_time, slot.end_time)}
                  </span>

                  {/* Status badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      slot.is_booked
                        ? 'bg-neutral-300 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-200'
                        : 'bg-success/10 dark:bg-success/20 text-success'
                    }`}
                  >
                    {slot.is_booked ? 'Booked' : 'Available'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
