const PLACEHOLDER_IMAGE = '/placeholder-listing.svg'

// Mirrors the `remotePatterns` allowlist in `next.config.ts`. Keep in sync —
// `next/image` throws for hosts not configured there, so any remote URL must be
// validated before being passed to an <Image>.
const ALLOWED_REMOTE_PATTERNS = [
  { protocol: 'http', hostname: '127.0.0.1', port: '54321' },
  { protocol: 'https', hostname: '*.supabase.co' },
]

/**
 * Returns `true` if the URL can be safely passed to `next/image`:
 * - local public assets (starting with `/`),
 * - or a host matching the configured remote patterns in `next.config.ts`.
 */
export function isAllowedImageSrc(src: string): boolean {
  if (src.startsWith('/')) return true

  let url: URL
  try {
    url = new URL(src)
  } catch {
    return false
  }

  return ALLOWED_REMOTE_PATTERNS.some(pattern => {
    if (pattern.protocol !== url.protocol.replace(':', '')) return false
    if (pattern.hostname === '*') return true
    if (pattern.hostname.startsWith('*.')) {
      return url.hostname.endsWith(pattern.hostname.slice(1))
    }
    if (url.hostname !== pattern.hostname) return false
    return !pattern.port || url.port === pattern.port
  })
}

/**
 * Returns the first allowed image URL, or the placeholder for listings without
 * usable images. Prevents `next/image` runtime errors for unconfigured hosts.
 */
export function getFirstAllowedImage(images: string[]): string {
  const image = images.find(isAllowedImageSrc)
  return image ?? PLACEHOLDER_IMAGE
}

/**
 * Filters an image list down to URLs `next/image` can render.
 */
export function filterAllowedImages(images: string[]): string[] {
  return images.filter(isAllowedImageSrc)
}
