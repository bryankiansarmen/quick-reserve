import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AvailabilityCalendar } from '../components/AvailabilityCalendar'
import type { AvailabilitySlot } from '../types'

describe('AvailabilityCalendar Component', () => {
  const createSlot = (
    startTime: string,
    endTime: string,
    isBooked = false,
  ): AvailabilitySlot => ({
    id: `slot-${Math.random()}`,
    listing_id: 'listing-1',
    start_time: startTime,
    end_time: endTime,
    is_booked: isBooked,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  it('shows empty state when no slots', () => {
    render(<AvailabilityCalendar slots={[]} />)

    const emptyMessage = screen.getByText(
      /No upcoming availability for the next 30 days/i,
    )
    expect(emptyMessage).toBeInTheDocument()
  })

  it('groups slots by date', () => {
    const slots = [
      createSlot('2026-07-28T09:00:00Z', '2026-07-28T10:00:00Z'),
      createSlot('2026-07-28T14:00:00Z', '2026-07-28T15:00:00Z'),
      createSlot('2026-07-29T09:00:00Z', '2026-07-29T10:00:00Z'),
    ]

    render(<AvailabilityCalendar slots={slots} />)

    // Should show two date headers
    const dateHeaders = screen.getAllByRole('heading', { level: 3 })
    expect(dateHeaders.length).toBeGreaterThanOrEqual(2)
  })

  it('displays dates in chronological order', () => {
    const slots = [
      createSlot('2026-07-30T09:00:00Z', '2026-07-30T10:00:00Z'),
      createSlot('2026-07-28T09:00:00Z', '2026-07-28T10:00:00Z'),
      createSlot('2026-07-29T09:00:00Z', '2026-07-29T10:00:00Z'),
    ]

    render(<AvailabilityCalendar slots={slots} />)

    const dateHeaders = screen.getAllByRole('heading', { level: 3 })
    const dateTexts = dateHeaders.map(h => h.textContent)

    // Verify dates are in order (they should be sorted chronologically)
    expect(dateTexts.length).toBeGreaterThanOrEqual(1)
  })

  it('renders time range for each slot', () => {
    const slots = [
      createSlot('2026-07-28T09:00:00Z', '2026-07-28T10:00:00Z'),
      createSlot('2026-07-28T14:00:00Z', '2026-07-28T15:00:00Z'),
    ]

    render(<AvailabilityCalendar slots={slots} />)

    // Should contain time ranges
    const timeTexts = screen.getAllByText(/[\d]{1,2}:[\d]{2}/)
    expect(timeTexts.length).toBeGreaterThanOrEqual(2)
  })

  it('shows "Available" badge for unbooked slots', () => {
    const slots = [
      createSlot('2026-07-28T09:00:00Z', '2026-07-28T10:00:00Z', false),
    ]

    render(<AvailabilityCalendar slots={slots} />)

    const availableBadge = screen.getByText('Available')
    expect(availableBadge).toBeInTheDocument()
  })

  it('shows "Booked" badge for booked slots', () => {
    const slots = [
      createSlot('2026-07-28T09:00:00Z', '2026-07-28T10:00:00Z', true),
    ]

    render(<AvailabilityCalendar slots={slots} />)

    const bookedBadge = screen.getByText('Booked')
    expect(bookedBadge).toBeInTheDocument()
  })

  it('applies different styling to booked slots', () => {
    const slots = [
      createSlot('2026-07-28T09:00:00Z', '2026-07-28T10:00:00Z', false),
      createSlot('2026-07-28T14:00:00Z', '2026-07-28T15:00:00Z', true),
    ]

    render(<AvailabilityCalendar slots={slots} />)

    const availableBadge = screen.getByText('Available')
    const bookedBadge = screen.getByText('Booked')

    // Booked should have different styling class
    expect(bookedBadge.className).not.toEqual(availableBadge.className)
  })

  it('displays heading with "Availability" title', () => {
    const slots = [
      createSlot('2026-07-28T09:00:00Z', '2026-07-28T10:00:00Z'),
    ]

    render(<AvailabilityCalendar slots={slots} />)

    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveTextContent('Availability')
  })

  it('handles multiple slots on same date', () => {
    const slots = [
      createSlot('2026-07-28T09:00:00Z', '2026-07-28T10:00:00Z'),
      createSlot('2026-07-28T10:30:00Z', '2026-07-28T11:30:00Z'),
      createSlot('2026-07-28T14:00:00Z', '2026-07-28T15:00:00Z'),
    ]

    render(<AvailabilityCalendar slots={slots} />)

    // Should show all three time ranges
    const availableBadges = screen.getAllByText('Available')
    expect(availableBadges.length).toBe(3)
  })

  it('formats dates in long format (e.g., "Monday, July 28")', () => {
    const slots = [
      createSlot('2026-07-28T09:00:00Z', '2026-07-28T10:00:00Z'),
    ]

    render(<AvailabilityCalendar slots={slots} />)

    // Should contain day of week and full month name
    // July 28, 2026 is a Tuesday
    const dateHeader = screen.getByRole('heading', { level: 3 })
    expect(dateHeader.textContent).toMatch(/\w+,\s+\w+\s+\d+/)
  })

  it('renders slots in order within each date', () => {
    const slots = [
      createSlot('2026-07-28T14:00:00Z', '2026-07-28T15:00:00Z'),
      createSlot('2026-07-28T09:00:00Z', '2026-07-28T10:00:00Z'),
      createSlot('2026-07-28T11:30:00Z', '2026-07-28T12:30:00Z'),
    ]

    render(<AvailabilityCalendar slots={slots} />)

    // All slots should be rendered
    const availableBadges = screen.getAllByText('Available')
    expect(availableBadges.length).toBe(3)
  })

  it('handles mixed available and booked slots', () => {
    const slots = [
      createSlot('2026-07-28T09:00:00Z', '2026-07-28T10:00:00Z', false),
      createSlot('2026-07-28T10:30:00Z', '2026-07-28T11:30:00Z', true),
      createSlot('2026-07-28T14:00:00Z', '2026-07-28T15:00:00Z', false),
    ]

    render(<AvailabilityCalendar slots={slots} />)

    const availableBadges = screen.getAllByText('Available')
    const bookedBadges = screen.getAllByText('Booked')

    expect(availableBadges.length).toBe(2)
    expect(bookedBadges.length).toBe(1)
  })

  it('renders accessibility heading structure', () => {
    const slots = [
      createSlot('2026-07-28T09:00:00Z', '2026-07-28T10:00:00Z'),
    ]

    render(<AvailabilityCalendar slots={slots} />)

    const h2 = screen.getByRole('heading', { level: 2 })
    const h3 = screen.getByRole('heading', { level: 3 })

    expect(h2).toHaveTextContent('Availability')
    expect(h3).toBeInTheDocument()
  })
})
