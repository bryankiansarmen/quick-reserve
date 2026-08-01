import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BookingCard } from '../components/BookingCard'
import type { BuyerBookingListItem } from '../types'

function makeBooking(
  overrides: Partial<BuyerBookingListItem> = {},
): BuyerBookingListItem {
  const status = overrides.status ?? 'pending'
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    status,
    amount_cents: 8500,
    created_at: '2026-07-20T12:00:00Z',
    has_review: false,
    // Default mirrors the data layer: pending/confirmed bookings with a
    // future slot are cancellable. Tests override it to model started slots.
    can_cancel: status === 'pending' || status === 'confirmed',
    listing: {
      id: '550e8400-e29b-41d4-a716-446655440001',
      title: 'Sunlit Photography Studio',
      location: 'Downtown',
      image: null,
    },
    slot: {
      start_time: '2026-08-10T09:00:00Z',
      end_time: '2026-08-10T11:00:00Z',
    },
    ...overrides,
  }
}

describe('BookingCard Component', () => {
  it('renders listing title, location, and the status badge', () => {
    render(<BookingCard booking={makeBooking({ status: 'confirmed' })} />)

    expect(screen.getByText('Sunlit Photography Studio')).toBeInTheDocument()
    expect(screen.getByText('Downtown')).toBeInTheDocument()
    expect(screen.getByText('confirmed')).toBeInTheDocument()
  })

  it('renders the formatted amount', () => {
    render(<BookingCard booking={makeBooking({ amount_cents: 9900 })} />)
    expect(screen.getByText('$99.00')).toBeInTheDocument()
  })

  it('renders the slot date and time range', () => {
    render(<BookingCard booking={makeBooking()} />)

    // formatAvailabilityDate produces e.g. "Monday, August 10" (no year)
    expect(screen.getByText(/\w+day, \w+ \d+/i)).toBeInTheDocument()
    // formatTimeRange produces e.g. "9:00 AM - 11:00 AM"
    expect(
      screen.getByText(/\d{1,2}:\d{2} (AM|PM) - \d{1,2}:\d{2} (AM|PM)/),
    ).toBeInTheDocument()
  })

  it('renders a fallback initials block when there is no image', () => {
    render(<BookingCard booking={makeBooking()} />)
    expect(screen.getByText('S')).toBeInTheDocument()
  })

  it('shows a "Complete payment" CTA for a pending booking', () => {
    const booking = makeBooking({ status: 'pending' })
    render(<BookingCard booking={booking} />)

    const link = screen.getByRole('link', { name: 'Complete payment' })
    expect(link).toHaveAttribute('href', `/checkout/${booking.id}`)
  })

  it('shows a "View confirmation" CTA for a confirmed booking', () => {
    const booking = makeBooking({ status: 'confirmed' })
    render(<BookingCard booking={booking} />)

    const link = screen.getByRole('link', { name: 'View confirmation' })
    expect(link).toHaveAttribute('href', `/checkout/${booking.id}/success`)
  })

  it('shows a "View confirmation" CTA for a completed booking', () => {
    const booking = makeBooking({ status: 'completed' })
    render(<BookingCard booking={booking} />)

    expect(
      screen.getByRole('link', { name: 'View confirmation' }),
    ).toHaveAttribute('href', `/checkout/${booking.id}/success`)
  })

  it('shows no CTA link for a cancelled booking', () => {
    render(<BookingCard booking={makeBooking({ status: 'cancelled' })} />)

    expect(screen.queryByRole('link', { name: 'Complete payment' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'View confirmation' })).not.toBeInTheDocument()
  })

  it('shows a "Cancel booking" button for a cancellable pending booking', () => {
    render(<BookingCard booking={makeBooking({ status: 'pending' })} />)

    expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument()
  })

  it('hides the "Cancel booking" button once the slot has started (can_cancel false)', () => {
    render(<BookingCard booking={makeBooking({ status: 'pending', can_cancel: false })} />)

    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument()
  })

  it('hides the "Cancel booking" button for a cancelled booking', () => {
    render(<BookingCard booking={makeBooking({ status: 'cancelled' })} />)

    expect(screen.queryByRole('button', { name: 'Cancel booking' })).not.toBeInTheDocument()
  })

  it('shows a "Leave review" button for a completed booking with no review', () => {
    render(<BookingCard booking={makeBooking({ status: 'completed', has_review: false })} />)

    expect(
      screen.getByRole('button', { name: 'Leave review' }),
    ).toBeInTheDocument()
  })

  it('does not show a "Leave review" button once a review already exists', () => {
    render(<BookingCard booking={makeBooking({ status: 'completed', has_review: true })} />)

    expect(
      screen.queryByRole('button', { name: 'Leave review' }),
    ).not.toBeInTheDocument()
  })

  it('does not show a "Leave review" button for non-completed bookings', () => {
    render(<BookingCard booking={makeBooking({ status: 'confirmed', has_review: false })} />)

    expect(
      screen.queryByRole('button', { name: 'Leave review' }),
    ).not.toBeInTheDocument()
  })
})
