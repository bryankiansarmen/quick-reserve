/**
 * Best-effort notification to the webhook service after a booking cancel.
 *
 * The webhook service is the only component with the service-role key, which
 * is required to resolve both parties' email addresses from auth.users (the
 * anon-key client used in this app cannot). It renders and sends the
 * cancellation emails via Resend.
 *
 * Failure is deliberately non-fatal: the booking is already cancelled, so an
 * email that fails to send must never surface as a cancel error.
 */
export async function notifyBookingCancelled(
  bookingId: string,
  cancelledBy: 'buyer' | 'seller',
): Promise<void> {
  const baseUrl = process.env.WEBHOOK_SERVICE_URL
  const token = process.env.INTERNAL_NOTIFICATION_TOKEN

  if (!baseUrl || !token) {
    console.warn(
      '[notifyBookingCancelled] Skipping cancellation email — WEBHOOK_SERVICE_URL / INTERNAL_NOTIFICATION_TOKEN not configured.',
      { bookingId },
    )
    return
  }

  try {
    await fetch(`${baseUrl.replace(/\/+$/, '')}/notifications/booking-cancelled`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': token,
      },
      body: JSON.stringify({ bookingId, cancelledBy }),
      signal: AbortSignal.timeout(5000),
    })
  } catch (error) {
    console.error(
      '[notifyBookingCancelled] Failed to notify webhook service (non-fatal):',
      {
        bookingId,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    )
  }
}
