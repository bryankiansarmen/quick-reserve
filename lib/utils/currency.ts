/**
 * Formats cents as dollars with 2 decimal places.
 * Examples: 8500 → "$85.00", 12000 → "$120.00"
 */
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

/**
 * Formats cents as dollars for display (no decimals if whole dollar).
 * Examples: 8500 → "$85", 8550 → "$85.50"
 * Use this for listing cards where brevity is preferred.
 */
export function formatPriceShort(cents: number): string {
  const dollars = cents / 100
  return dollars % 1 === 0 ? `$${dollars}` : `$${dollars.toFixed(2)}`
}

/**
 * Converts dollar string to cents.
 * Examples: "85" → 8500, "85.50" → 8550, "invalid" → null
 * Returns null if input is invalid or negative.
 */
export function dollarsToCents(value: string): number | null {
  const parsed = parseFloat(value)
  if (isNaN(parsed) || parsed < 0) return null
  return Math.round(parsed * 100)
}

/**
 * Converts cents to dollar string for form inputs.
 * Examples: 8500 → "85.00", 8550 → "85.50"
 * Always returns with 2 decimal places.
 */
export function centsToDollars(cents: number): string {
  return (cents / 100).toFixed(2)
}
