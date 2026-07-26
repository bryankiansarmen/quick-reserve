import { NextRequest } from 'next/server'

/**
 * Simple in-memory rate limiter for API endpoints.
 * 
 * Limits requests per IP address using a sliding window algorithm.
 * For production, consider using Vercel Edge Config or Redis for distributed rate limiting.
 * 
 * @example
 * const limiter = createRateLimiter({ requests: 100, window: 60000 })
 * const result = await limiter.check(request)
 * if (!result.success) {
 *   return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
 * }
 */

interface RateLimitConfig {
  /** Maximum number of requests allowed within the time window */
  requests: number
  /** Time window in milliseconds */
  window: number
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

// Store: Map<IP, Array<timestamp>>
const requestLog = new Map<string, number[]>()

/**
 * Create a rate limiter with specified configuration.
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { requests: maxRequests, window } = config

  return {
    /**
     * Check if the request should be rate limited.
     * Returns success=true if within limits, success=false if exceeded.
     */
    async check(request: NextRequest): Promise<RateLimitResult> {
      // Get client IP from headers (supports X-Forwarded-For for proxies)
      const ip = getClientIp(request)
      const now = Date.now()
      const windowStart = now - window

      // Get existing requests for this IP
      const ipRequests = requestLog.get(ip) || []

      // Filter out requests outside the current window
      const recentRequests = ipRequests.filter((timestamp) => timestamp > windowStart)

      // Check if limit exceeded
      if (recentRequests.length >= maxRequests) {
        // Calculate when the oldest request will expire
        const oldestRequest = recentRequests[0]
        const resetTime = oldestRequest + window

        return {
          success: false,
          limit: maxRequests,
          remaining: 0,
          reset: Math.ceil(resetTime / 1000), // Unix timestamp in seconds
        }
      }

      // Add current request timestamp
      recentRequests.push(now)
      requestLog.set(ip, recentRequests)

      return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - recentRequests.length,
        reset: Math.ceil((now + window) / 1000),
      }
    },
  }
}

/**
 * Extract client IP from request headers.
 * Checks X-Forwarded-For (proxy/CDN) and falls back to X-Real-IP or direct connection.
 */
function getClientIp(request: NextRequest): string {
  // Check X-Forwarded-For header (Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim()
  }

  // Check X-Real-IP header (some proxies)
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp.trim()
  }

  // Fallback to a default identifier (for local development)
  return 'unknown'
}

/**
 * Clean up old entries from the request log.
 * Should be called periodically to prevent memory leaks.
 */
export function cleanupRateLimitLog(maxAge: number = 3600000) {
  const now = Date.now()
  const cutoff = now - maxAge

  for (const [ip, timestamps] of requestLog.entries()) {
    const recentTimestamps = timestamps.filter((t) => t > cutoff)
    
    if (recentTimestamps.length === 0) {
      requestLog.delete(ip)
    } else {
      requestLog.set(ip, recentTimestamps)
    }
  }
}

// Clean up every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => cleanupRateLimitLog(), 3600000)
}
