import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ReviewDialog } from '../components/ReviewDialog'

const BOOKING_ID = '550e8400-e29b-41d4-a716-446655440000'

function renderDialog(overrides: Record<string, unknown> = {}) {
  const props = {
    bookingId: BOOKING_ID,
    listingTitle: 'Sunlit Photography Studio',
    isOpen: true,
    onClose: vi.fn(),
    onSubmitted: vi.fn(),
    ...overrides,
  }
  render(<ReviewDialog {...props} />)
  return props
}

function mockFetchOnce(response: { status: number; body: unknown }) {
  return vi
    .spyOn(global, 'fetch')
    .mockResolvedValueOnce(
      new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ReviewDialog Component', () => {
  it('renders the dialog with the listing title and rating stars', () => {
    renderDialog()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /Review Sunlit Photography Studio/i }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('1 star')).toBeInTheDocument()
    expect(screen.getByLabelText('5 stars')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Submit review' }),
    ).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    renderDialog({ isOpen: false })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('submits a review and calls onSubmitted on success', async () => {
    const fetchMock = mockFetchOnce({ status: 201, body: { data: { id: 'r1' } } })
    const onSubmitted = vi.fn()
    renderDialog({ onSubmitted })

    fireEvent.click(screen.getByLabelText('4 stars'))
    fireEvent.change(screen.getByLabelText(/Your review/i), {
      target: { value: 'Great space!' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }))

    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1))
    expect(fetchMock).toHaveBeenCalledWith('/api/reviews', expect.any(Object))
    const [, init] = fetchMock.mock.calls[0]
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body as string)
    expect(body).toEqual({
      booking_id: BOOKING_ID,
      rating: 4,
      comment: 'Great space!',
    })
  })

  it('omits the comment from the payload when blank', async () => {
    const fetchMock = mockFetchOnce({ status: 201, body: { data: { id: 'r1' } } })
    renderDialog()

    fireEvent.click(screen.getByLabelText('5 stars'))
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(init.body as string)
    expect(body).toEqual({ booking_id: BOOKING_ID, rating: 5 })
    expect(body).not.toHaveProperty('comment')
  })

  it('does not submit without a rating and shows an inline error', async () => {
    const fetchMock = vi.spyOn(global, 'fetch')
    renderDialog()

    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByText(/select a rating/i)).toBeInTheDocument()
  })

  it('shows an inline error when the review already exists', async () => {
    mockFetchOnce({
      status: 409,
      body: {
        error: {
          code: 'REVIEW_ALREADY_EXISTS',
          message: 'You have already reviewed this booking.',
        },
      },
    })
    renderDialog()

    fireEvent.click(screen.getByLabelText('5 stars'))
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }))

    expect(await screen.findByText(/already reviewed/i)).toBeInTheDocument()
  })

  it('shows an inline error for a non-completed booking', async () => {
    mockFetchOnce({
      status: 403,
      body: {
        error: {
          code: 'BOOKING_NOT_COMPLETED',
          message: 'This booking is not yet eligible for a review.',
        },
      },
    })
    renderDialog()

    fireEvent.click(screen.getByLabelText('5 stars'))
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }))

    expect(await screen.findByText(/not yet eligible/i)).toBeInTheDocument()
  })

  it('displays field-level errors returned by the API', async () => {
    mockFetchOnce({
      status: 400,
      body: {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body.',
          details: { comment: ['comment must be 1000 characters or fewer'] },
        },
      },
    })
    renderDialog()

    fireEvent.click(screen.getByLabelText('5 stars'))
    fireEvent.click(screen.getByRole('button', { name: 'Submit review' }))

    expect(
      await screen.findByText(/1000 characters or fewer/i),
    ).toBeInTheDocument()
  })

  it('shows a live character counter', () => {
    renderDialog()

    expect(screen.getByText('0/1000')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/Your review/i), {
      target: { value: 'abc' },
    })
    expect(screen.getByText('3/1000')).toBeInTheDocument()
  })

  it('closes via the Cancel button', () => {
    const onClose = vi.fn()
    renderDialog({ onClose })

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes via the Escape key', () => {
    const onClose = vi.fn()
    renderDialog({ onClose })

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes when the backdrop is clicked', () => {
    const onClose = vi.fn()
    renderDialog({ onClose })

    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
