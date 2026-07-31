import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SellerEarningsCard } from '../components/SellerEarningsCard'
import type { SellerEarningsBooking } from '../types'

function makeBooking(
  overrides: Partial<SellerEarningsBooking> = {},
): SellerEarningsBooking {
  return {
    id: '550e8400-e29b-41d4-a716-446655440000',
    status: 'confirmed',
    amount_cents: 8500,
    created_at: '2026-07-20T12:00:00Z',
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

describe('SellerEarningsCard Component', () => {
  it('renders listing title, location, status badge, and buyer name', () => {
    render(<SellerEarningsCard booking={makeBooking({ status: 'completed' })} />)

    expect(screen.getByText('Sunlit Photography Studio')).toBeInTheDocument()
    expect(screen.getByText('Downtown')).toBeInTheDocument()
    expect(screen.getByText('completed')).toBeInTheDocument()
    expect(screen.getByText(/Booked by/)).toBeInTheDocument()
    expect(screen.getByText('Devon Renter')).toBeInTheDocument()
  })

  it('renders the earned amount with a plus sign', () => {
    render(<SellerEarningsCard booking={makeBooking({ amount_cents: 9900 })} />)
    expect(screen.getByText('+ $99.00')).toBeInTheDocument()
  })

  it('renders the slot date and time range', () => {
    render(<SellerEarningsCard booking={makeBooking()} />)

    // formatAvailabilityDate produces e.g. "Monday, August 10" (no year)
    expect(screen.getByText(/\w+day, \w+ \d+/i)).toBeInTheDocument()
    // formatTimeRange produces e.g. "9:00 AM - 11:00 AM"
    expect(
      screen.getByText(/\d{1,2}:\d{2} (AM|PM) - \d{1,2}:\d{2} (AM|PM)/),
    ).toBeInTheDocument()
  })

  it('renders a fallback initials block when there is no image', () => {
    render(<SellerEarningsCard booking={makeBooking()} />)
    expect(screen.getByText('S')).toBeInTheDocument()
  })
})
