import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OrderSummary } from '../components/OrderSummary'

const mockSummary = {
  listing: {
    title: 'Sunlit Photography Studio',
    image: '/studio.jpg',
  },
  slot: {
    start_time: '2026-08-10T09:00:00Z',
    end_time: '2026-08-10T11:00:00Z',
  },
  seller: {
    full_name: 'Alex Rivera',
  },
  amountCents: 8500,
}

describe('OrderSummary Component', () => {
  it('renders listing title and host name', () => {
    render(<OrderSummary {...mockSummary} />)

    expect(screen.getByText('Sunlit Photography Studio')).toBeInTheDocument()
    expect(screen.getByText(/Hosted by Alex Rivera/i)).toBeInTheDocument()
  })

  it('renders the total price', () => {
    render(<OrderSummary {...mockSummary} />)
    expect(screen.getByText('$85.00')).toBeInTheDocument()
  })

  it('renders the booking date', () => {
    render(
      <OrderSummary
        {...mockSummary}
        slot={{
          start_time: '2026-08-10T12:00:00Z',
          end_time: '2026-08-10T14:00:00Z',
        }}
      />,
    )
    // formatAvailabilityDate produces e.g. "Monday, August 10" (no year)
    expect(screen.getByText(/\w+day, \w+ \d+/i)).toBeInTheDocument()
  })

  it('renders a fallback initials block when there is no image', () => {
    render(<OrderSummary {...mockSummary} listing={{ title: 'Test', image: null }} />)
    expect(screen.getByText('T')).toBeInTheDocument()
  })
})
