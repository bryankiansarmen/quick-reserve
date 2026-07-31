import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SellerBookingCard } from '../components/SellerBookingCard'
import type { SellerBookingListItem } from '../types'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

function makeBooking(
  overrides: Partial<SellerBookingListItem> = {},
): SellerBookingListItem {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    status: 'pending',
    amount_cents: 8500,
    created_at: '2026-07-20T12:00:00Z',
    booking_mode: 'request',
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
    buyer: {
      full_name: 'Devon Renter',
    },
    ...overrides,
  }
}

describe('SellerBookingCard Component', () => {
  it('renders listing title, location, status badge, and buyer name', () => {
    render(<SellerBookingCard booking={makeBooking({ status: 'confirmed' })} />)

    expect(screen.getByText('Sunlit Photography Studio')).toBeInTheDocument()
    expect(screen.getByText('Downtown')).toBeInTheDocument()
    expect(screen.getByText('confirmed')).toBeInTheDocument()
    expect(screen.getByText(/Booked by/)).toBeInTheDocument()
    expect(screen.getByText('Devon Renter')).toBeInTheDocument()
  })

  it('renders the formatted amount', () => {
    render(<SellerBookingCard booking={makeBooking({ amount_cents: 9900 })} />)
    expect(screen.getByText('$99.00')).toBeInTheDocument()
  })

  it('renders the slot date and time range', () => {
    render(<SellerBookingCard booking={makeBooking()} />)

    // formatAvailabilityDate produces e.g. "Monday, August 10" (no year)
    expect(screen.getByText(/\w+day, \w+ \d+/i)).toBeInTheDocument()
    // formatTimeRange produces e.g. "9:00 AM - 11:00 AM"
    expect(
      screen.getByText(/\d{1,2}:\d{2} (AM|PM) - \d{1,2}:\d{2} (AM|PM)/),
    ).toBeInTheDocument()
  })

  it('renders a fallback initials block when there is no image', () => {
    render(<SellerBookingCard booking={makeBooking()} />)
    expect(screen.getByText('S')).toBeInTheDocument()
  })

  it('shows Accept and Decline buttons for a pending request-mode booking', () => {
    render(<SellerBookingCard booking={makeBooking({ status: 'pending', booking_mode: 'request' })} />)

    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Decline' })).toBeInTheDocument()
  })

  it('hides Accept/Decline for a pending booking on an instant-mode listing', () => {
    render(<SellerBookingCard booking={makeBooking({ status: 'pending', booking_mode: 'instant' })} />)

    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument()
  })

  it('hides Accept/Decline for a confirmed request-mode booking', () => {
    render(<SellerBookingCard booking={makeBooking({ status: 'confirmed', booking_mode: 'request' })} />)

    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument()
  })

  it('hides Accept/Decline for a cancelled request-mode booking', () => {
    render(<SellerBookingCard booking={makeBooking({ status: 'cancelled', booking_mode: 'request' })} />)

    expect(screen.queryByRole('button', { name: 'Accept' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Decline' })).not.toBeInTheDocument()
  })
})
