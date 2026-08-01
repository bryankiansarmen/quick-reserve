import type { ListingCategory } from '@/features/listings/validation'

/**
 * Human-readable labels for listing categories.
 * Used in dropdowns, filters, and display throughout the app.
 */
export const CATEGORY_LABELS: Record<ListingCategory, string> = {
  'photography-studio': 'Photography Studio',
  'event-venue': 'Event Venue',
  'meeting-room': 'Meeting Room',
  'activity-space': 'Activity Space',
} as const

/**
 * Category options for select/dropdown components.
 * Combines value and label for easy rendering.
 */
export const CATEGORY_OPTIONS = [
  { value: 'photography-studio', label: 'Photography Studio' },
  { value: 'event-venue', label: 'Event Venue' },
  { value: 'meeting-room', label: 'Meeting Room' },
  { value: 'activity-space', label: 'Activity Space' },
] as const
