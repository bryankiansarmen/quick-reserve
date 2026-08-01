import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BookingSection } from '../components/BookingSection'
import type { AvailabilitySlot } from '../types'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), prefetch: vi.fn() }),
}))

function createSlot(
  id: string,
  startTime: string,
  endTime: string,
  isBooked = false,
): AvailabilitySlot {
  return {
    id,
    listing_id: 'listing-1',
    start_time: startTime,
    end_time: endTime,
    is_booked: isBooked,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

const availableSlots: AvailabilitySlot[] = [
  createSlot('slot-1', '2026-08-10T09:00:00Z', '2026-08-10T11:00:00Z'),
  createSlot('slot-2', '2026-08-10T14:00:00Z', '2026-08-10T16:00:00Z'),
]

function renderSection(overrides: Partial<Parameters<typeof BookingSection>[0]> = {}) {
  return render(
    <BookingSection
      listingId="listing-1"
      bookingMode="instant"
      slots={availableSlots}
      isAuthenticated={true}
      {...overrides}
    />,
  )
}

describe('BookingSection Component', () => {
  beforeEach(() => {
    mockPush.mockReset()
  })

  it('renders "Book Now" CTA for instant listings', () => {
    renderSection()
    expect(screen.getByRole('button', { name: /Book Now/i })).toBeInTheDocument()
  })

  it('renders "Request to Book" CTA for request listings', () => {
    renderSection({ bookingMode: 'request' })
    expect(screen.getByRole('button', { name: /Request to Book/i })).toBeInTheDocument()
  })

  it('disables Book button until a slot is selected', () => {
    renderSection()
    expect(screen.getByRole('button', { name: /Book Now/i })).toBeDisabled()
  })

  it('enables Book button after selecting an available slot', () => {
    renderSection()
    const slotButtons = screen.getAllByRole('button', { name: /^Select /i })
    fireEvent.click(slotButtons[0])

    expect(screen.getByRole('button', { name: /Book Now/i })).toBeEnabled()
  })

  it('shows selected slot summary after selection', () => {
    renderSection()
    const slotButtons = screen.getAllByRole('button', { name: /^Select /i })
    fireEvent.click(slotButtons[0])

    expect(screen.getByText(/Selected:/i)).toBeInTheDocument()
  })

  it('does not allow selecting booked slots', () => {
    renderSection({ slots: [...availableSlots, createSlot('slot-3', '2026-08-11T09:00:00Z', '2026-08-11T10:00:00Z', true)] })

    // Booked slots render as non-button rows
    const bookedRow = screen.getByText('Booked')
    expect(bookedRow).toBeInTheDocument()

    // Only the 2 available slots render as selectable buttons
    const slotButtons = screen.getAllByRole('button', { name: /^Select /i })
    expect(slotButtons).toHaveLength(2)
  })

  it('redirects to login when not authenticated', () => {
    renderSection({ isAuthenticated: false })
    const slotButtons = screen.getAllByRole('button', { name: /^Select /i })
    fireEvent.click(slotButtons[0])
    fireEvent.click(screen.getByRole('button', { name: /Book Now/i }))

    expect(mockPush).toHaveBeenCalledWith(
      '/login?redirectTo=%2Flistings%2Flisting-1',
    )
  })

  it('calls POST /api/bookings and navigates to checkout on success', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ booking_id: 'booking-123' }),
    }) as unknown as typeof fetch

    renderSection()
    const slotButtons = screen.getAllByRole('button', { name: /^Select /i })
    fireEvent.click(slotButtons[0])
    fireEvent.click(screen.getByRole('button', { name: /Book Now/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/bookings',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ listing_id: 'listing-1', slot_id: 'slot-1' }),
        }),
      )
      expect(mockPush).toHaveBeenCalledWith('/checkout/booking-123')
    })

    vi.restoreAllMocks()
  })

  it('shows SLOT_UNAVAILABLE error message on 409', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        error: {
          code: 'SLOT_UNAVAILABLE',
          message: 'This slot is no longer available.',
        },
      }),
    }) as unknown as typeof fetch

    renderSection()
    const slotButtons = screen.getAllByRole('button', { name: /^Select /i })
    fireEvent.click(slotButtons[0])
    fireEvent.click(screen.getByRole('button', { name: /Book Now/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/This slot is no longer available/i),
      ).toBeInTheDocument()
    })

    vi.restoreAllMocks()
  })

  it('shows generic error message on unexpected API failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: { message: 'Internal error.' } }),
    }) as unknown as typeof fetch

    renderSection()
    const slotButtons = screen.getAllByRole('button', { name: /^Select /i })
    fireEvent.click(slotButtons[0])
    fireEvent.click(screen.getByRole('button', { name: /Book Now/i }))

    await waitFor(() => {
      expect(screen.getByText(/Internal error/i)).toBeInTheDocument()
    })

    vi.restoreAllMocks()
  })

  it('clears the error when selecting a new slot', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: { code: 'SLOT_UNAVAILABLE', message: 'Unavailable.' } }),
    }) as unknown as typeof fetch

    renderSection()
    const slotButtons = screen.getAllByRole('button', { name: /^Select /i })
    fireEvent.click(slotButtons[0])
    fireEvent.click(screen.getByRole('button', { name: /Book Now/i }))

    await waitFor(() => {
      expect(screen.getByText(/Unavailable/i)).toBeInTheDocument()
    })

    fireEvent.click(slotButtons[1])
    expect(screen.queryByText(/Unavailable/i)).not.toBeInTheDocument()

    vi.restoreAllMocks()
  })
})
