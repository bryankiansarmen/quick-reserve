import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CancelBookingButton } from '../components/CancelBookingButton'

const refreshMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock }),
}))

const BOOKING_ID = '550e8400-e29b-41d4-a716-446655440000'

describe('CancelBookingButton Component', () => {
  beforeEach(() => {
    refreshMock.mockClear()
  })

  it('renders a Cancel booking button', () => {
    render(<CancelBookingButton bookingId={BOOKING_ID} />)
    expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument()
  })

  it('asks for confirmation before sending the cancel request', async () => {
    const user = userEvent.setup()

    render(<CancelBookingButton bookingId={BOOKING_ID} />)
    await user.click(screen.getByRole('button', { name: 'Cancel booking' }))

    expect(screen.getByRole('dialog')).toHaveTextContent('Cancel this booking?')
    expect(screen.getByRole('button', { name: 'Yes, cancel booking' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Keep booking' })).toBeInTheDocument()
  })

  it('calls PATCH /api/bookings/[id] with action cancel and refreshes on success', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: { id: BOOKING_ID, status: 'cancelled' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<CancelBookingButton bookingId={BOOKING_ID} />)
    await user.click(screen.getByRole('button', { name: 'Cancel booking' }))
    await user.click(screen.getByRole('button', { name: 'Yes, cancel booking' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(`/api/bookings/${BOOKING_ID}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      })
      expect(refreshMock).toHaveBeenCalledTimes(1)
    })

    vi.unstubAllGlobals()
  })

  it('closes the confirmation without fetching when Keep booking is chosen', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    render(<CancelBookingButton bookingId={BOOKING_ID} />)
    await user.click(screen.getByRole('button', { name: 'Cancel booking' }))
    await user.click(screen.getByRole('button', { name: 'Keep booking' }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    vi.unstubAllGlobals()
  })

  it('shows the server error message and does not refresh on failure', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({
        error: { message: 'This booking can no longer be cancelled.' },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<CancelBookingButton bookingId={BOOKING_ID} />)
    await user.click(screen.getByRole('button', { name: 'Cancel booking' }))
    await user.click(screen.getByRole('button', { name: 'Yes, cancel booking' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'This booking can no longer be cancelled.',
      )
      expect(refreshMock).not.toHaveBeenCalled()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    vi.unstubAllGlobals()
  })

  it('shows a fallback message when the error response is not JSON', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: vi.fn().mockRejectedValue(new Error('bad json')),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<CancelBookingButton bookingId={BOOKING_ID} />)
    await user.click(screen.getByRole('button', { name: 'Cancel booking' }))
    await user.click(screen.getByRole('button', { name: 'Yes, cancel booking' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Something went wrong. Please try again.',
      )
    })

    vi.unstubAllGlobals()
  })

  it('shows a fallback message when fetch rejects', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
    vi.stubGlobal('fetch', fetchMock)

    render(<CancelBookingButton bookingId={BOOKING_ID} />)
    await user.click(screen.getByRole('button', { name: 'Cancel booking' }))
    await user.click(screen.getByRole('button', { name: 'Yes, cancel booking' }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Something went wrong. Please try again.',
      )
    })

    vi.unstubAllGlobals()
  })

  it('clears a previous error before retrying', async () => {
    const user = userEvent.setup()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: { message: 'First failure.' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: { id: BOOKING_ID, status: 'cancelled' } }),
      })
    vi.stubGlobal('fetch', fetchMock)

    render(<CancelBookingButton bookingId={BOOKING_ID} />)

    await user.click(screen.getByRole('button', { name: 'Cancel booking' }))
    await user.click(screen.getByRole('button', { name: 'Yes, cancel booking' }))
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('First failure.')
    })

    // The button is re-created each time the confirm dialog closes, so
    // re-query it instead of reusing a stale reference.
    await user.click(screen.getByRole('button', { name: 'Cancel booking' }))
    await user.click(screen.getByRole('button', { name: 'Yes, cancel booking' }))
    await waitFor(() => {
      expect(refreshMock).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })

    vi.unstubAllGlobals()
  })
})
