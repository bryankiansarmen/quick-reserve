import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BookingStatusPoller } from '../components/BookingStatusPoller'

const mockRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(), refresh: mockRefresh }),
}))

describe('BookingStatusPoller Component', () => {
  beforeEach(() => {
    mockRefresh.mockReset()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a "Check booking status" action', () => {
    render(<BookingStatusPoller bookingId="booking-1" />)
    expect(
      screen.getByRole('button', { name: /Check booking status/i }),
    ).toBeInTheDocument()
  })

  it('refreshes the page on an interval while pending', () => {
    render(<BookingStatusPoller bookingId="booking-1" />)

    expect(mockRefresh).not.toHaveBeenCalled()

    vi.advanceTimersByTime(4000)
    expect(mockRefresh).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(4000)
    expect(mockRefresh).toHaveBeenCalledTimes(2)
  })

  it('stops polling after MAX_POLLS refreshes', () => {
    render(<BookingStatusPoller bookingId="booking-1" />)

    // MAX_POLLS = 15
    vi.advanceTimersByTime(4000 * 16)
    expect(mockRefresh).toHaveBeenCalledTimes(15)
  })

  it('manually refreshes when the button is clicked', () => {
    render(<BookingStatusPoller bookingId="booking-1" />)
    fireEvent.click(screen.getByRole('button', { name: /Check booking status/i }))
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })
})
