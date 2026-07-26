/**
 * Time and date formatting utilities for display throughout the app.
 */

/**
 * Format a time range into a human-readable string.
 * Example: "9:00 AM - 12:00 PM" or "14:30 - 16:30" (24h format)
 *
 * @param startTime ISO 8601 timestamp (UTC)
 * @param endTime ISO 8601 timestamp (UTC)
 * @param locale Browser locale string (defaults to 'en-US')
 * @returns Formatted time range string
 */
export function formatTimeRange(
  startTime: string,
  endTime: string,
  locale = 'en-US',
): string {
  try {
    const start = new Date(startTime)
    const end = new Date(endTime)

    // Format times using Intl.DateTimeFormat for locale awareness
    const timeFormatter = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: locale === 'en-US', // 12-hour for US, 24-hour for others
    })

    const startStr = timeFormatter.format(start)
    const endStr = timeFormatter.format(end)

    return `${startStr} - ${endStr}`
  } catch (error) {
    console.error('[formatTimeRange] Error formatting times:', error)
    return 'Time not available'
  }
}

/**
 * Format a date for display in the availability calendar.
 * Example: "Monday, July 28" or "Mo, 28 Jul" (condensed)
 *
 * @param dateStr ISO date string (YYYY-MM-DD or full ISO timestamp)
 * @param format 'long' | 'short' (default: 'long')
 * @param locale Browser locale string (defaults to 'en-US')
 * @returns Formatted date string
 */
export function formatAvailabilityDate(
  dateStr: string,
  format: 'long' | 'short' = 'long',
  locale = 'en-US',
): string {
  try {
    const date = new Date(dateStr)

    if (format === 'long') {
      return new Intl.DateTimeFormat(locale, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }).format(date)
    } else {
      return new Intl.DateTimeFormat(locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(date)
    }
  } catch (error) {
    console.error('[formatAvailabilityDate] Error formatting date:', error)
    return 'Date not available'
  }
}

/**
 * Group slots by date (YYYY-MM-DD).
 * Returns a Map of date strings to arrays of slots on that date.
 *
 * @param slots Array of availability slots
 * @returns Map of date strings to slot arrays, sorted chronologically
 */
export function groupSlotsByDate(
  slots: Array<{ start_time: string; end_time: string; id: string; is_booked: boolean }>,
): Map<string, typeof slots> {
  const grouped = new Map<string, typeof slots>()

  for (const slot of slots) {
    // Extract just the date part (YYYY-MM-DD)
    const dateStr = slot.start_time.split('T')[0]

    if (!grouped.has(dateStr)) {
      grouped.set(dateStr, [])
    }
    grouped.get(dateStr)!.push(slot)
  }

  // Convert to sorted array of entries (chronological order)
  return new Map(Array.from(grouped).sort((a, b) => a[0].localeCompare(b[0])))
}
