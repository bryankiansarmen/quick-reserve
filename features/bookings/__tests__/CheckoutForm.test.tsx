import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { CheckoutForm } from '../components/CheckoutForm'

const mockConfirmPayment = vi.fn()

vi.mock('@stripe/react-stripe-js', () => ({
  useStripe: () => ({
    confirmPayment: mockConfirmPayment,
  }),
  useElements: () => ({}),
  PaymentElement: () => <div data-testid="payment-element" />,
}))

describe('CheckoutForm Component', () => {
  beforeEach(() => {
    mockConfirmPayment.mockReset()
  })

  it('renders the PaymentElement', () => {
    render(<CheckoutForm bookingId="booking-1" amountCents={8500} />)
    expect(screen.getByTestId('payment-element')).toBeInTheDocument()
  })

  it('shows the formatted price on the submit button', () => {
    render(<CheckoutForm bookingId="booking-1" amountCents={8500} />)
    expect(screen.getByRole('button', { name: /Pay \$85.00/i })).toBeInTheDocument()
  })

  it('submits with correct return_url on success', async () => {
    mockConfirmPayment.mockResolvedValue({ error: null })

    render(<CheckoutForm bookingId="booking-123" amountCents={5000} />)
    fireEvent.click(screen.getByRole('button', { name: /Pay \$50.00/i }))

    await waitFor(() => {
      expect(mockConfirmPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          confirmParams: {
            return_url: 'http://localhost:3000/checkout/booking-123/success',
          },
        }),
      )
    })
  })

  it('disables submit button while processing', async () => {
    let resolveConfirm: (value: unknown) => void
    mockConfirmPayment.mockReturnValue(
      new Promise(resolve => {
        resolveConfirm = resolve
      }),
    )

    render(<CheckoutForm bookingId="booking-1" amountCents={5000} />)
    fireEvent.click(screen.getByRole('button', { name: /Pay \$50.00/i }))

    const button = screen.getByRole('button', { name: /Processing payment/i })
    expect(button).toBeDisabled()

    // On success Stripe redirects to return_url; the button stays in the
    // processing state while waiting for the redirect.
    resolveConfirm!({ error: null })
    await waitFor(() => {
      expect(mockConfirmPayment).toHaveBeenCalledTimes(1)
    })
    expect(
      screen.getByRole('button', { name: /Processing payment/i }),
    ).toBeDisabled()
  })

  it('shows declined card message on card_declined error', async () => {
    mockConfirmPayment.mockResolvedValue({
      error: { type: 'card_error', code: 'card_declined', message: 'card declined' },
    })

    render(<CheckoutForm bookingId="booking-1" amountCents={5000} />)
    fireEvent.click(screen.getByRole('button', { name: /Pay \$50.00/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/Your card was declined/i),
      ).toBeInTheDocument()
    })
  })

  it('shows insufficient funds message on insufficient_funds error', async () => {
    mockConfirmPayment.mockResolvedValue({
      error: { type: 'card_error', code: 'insufficient_funds', message: 'insufficient' },
    })

    render(<CheckoutForm bookingId="booking-1" amountCents={5000} />)
    fireEvent.click(screen.getByRole('button', { name: /Pay \$50.00/i }))

    await waitFor(() => {
      expect(screen.getByText(/insufficient funds/i)).toBeInTheDocument()
    })
  })

  it('falls back to Stripe message for unknown errors', async () => {
    mockConfirmPayment.mockResolvedValue({
      error: { type: 'validation_error', message: 'Invalid CVC.' },
    })

    render(<CheckoutForm bookingId="booking-1" amountCents={5000} />)
    fireEvent.click(screen.getByRole('button', { name: /Pay \$50.00/i }))

    await waitFor(() => {
      expect(screen.getByText(/Invalid CVC/i)).toBeInTheDocument()
    })
  })

  it('re-enables the button after an error so the user can retry', async () => {
    mockConfirmPayment.mockResolvedValue({
      error: { type: 'card_error', code: 'card_declined', message: 'declined' },
    })

    render(<CheckoutForm bookingId="booking-1" amountCents={5000} />)
    fireEvent.click(screen.getByRole('button', { name: /Pay \$50.00/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Pay \$50.00/i })).toBeEnabled()
    })
  })
})
