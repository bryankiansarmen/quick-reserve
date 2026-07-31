import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReviewButton } from '../components/ReviewButton'

const mockRefresh = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}))

beforeEach(() => {
  mockRefresh.mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ReviewButton Component', () => {
  it('renders a "Leave review" button', () => {
    render(<ReviewButton bookingId="b1" listingTitle="Studio" />)

    expect(
      screen.getByRole('button', { name: 'Leave review' }),
    ).toBeInTheDocument()
  })

  it('opens the review dialog when clicked', () => {
    render(<ReviewButton bookingId="b1" listingTitle="Studio" />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Leave review' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes the dialog and refreshes the router after a successful submit', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'r1' } }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    render(<ReviewButton bookingId="b1" listingTitle="Studio" />)

    fireEvent.click(screen.getByRole('button', { name: 'Leave review' }))
    fireEvent.click(screen.getByLabelText('5 stars'))
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }))

    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the dialog open after a failed submit', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'BOOKING_NOT_COMPLETED', message: 'not eligible' },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      ),
    )
    render(<ReviewButton bookingId="b1" listingTitle="Studio" />)

    fireEvent.click(screen.getByRole('button', { name: 'Leave review' }))
    fireEvent.click(screen.getByLabelText('5 stars'))
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }))

    expect(await screen.findByText(/not yet eligible/i)).toBeInTheDocument()
    expect(mockRefresh).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
