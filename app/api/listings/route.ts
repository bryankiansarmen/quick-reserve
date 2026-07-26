import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { searchListings } from '@/features/listings/queries'
import { searchQuerySchema } from '@/features/listings/validation'
import { createRateLimiter } from '@/lib/utils/rate-limit'

// Rate limiter: 100 requests per minute per IP
const rateLimiter = createRateLimiter({
  requests: 100,
  window: 60000, // 60 seconds
})

/**
 * GET /api/listings
 *
 * Search and browse published listings with optional filtering, sorting, and pagination.
 * No authentication required (public endpoint).
 *
 * Query parameters:
 *   - category: Filter by listing category
 *   - location: Filter by location (case-insensitive partial match)
 *   - minPrice: Minimum price in cents
 *   - maxPrice: Maximum price in cents
 *   - date: ISO date (YYYY-MM-DD) to filter for available slots
 *   - page: Page number (default: 1)
 *   - pageSize: Items per page (default: 20, max: 50)
 *   - sort: Sort order (price_asc, price_desc, rating_desc, newest; default: newest)
 *
 * Response:
 *   {
 *     "data": [
 *       {
 *         "id": "uuid",
 *         "title": "string",
 *         "price_cents": number,
 *         "location": "string",
 *         "images": ["url"],
 *         "avg_rating": number,
 *         "review_count": number
 *       }
 *     ],
 *     "pagination": {
 *       "page": number,
 *       "pageSize": number,
 *       "total": number
 *     }
 *   }
 */
export async function GET(request: NextRequest) {
  try {
    // Rate limiting check
    const rateLimitResult = await rateLimiter.check(request)
    if (!rateLimitResult.success) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
          },
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            'Retry-After': Math.ceil((rateLimitResult.reset * 1000 - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    // Extract query parameters from URL
    const searchParams = request.nextUrl.searchParams

    const rawParams = {
      category: searchParams.get('category') || undefined,
      location: searchParams.get('location') || undefined,
      minPrice: searchParams.get('minPrice') || undefined,
      maxPrice: searchParams.get('maxPrice') || undefined,
      date: searchParams.get('date') || undefined,
      page: searchParams.get('page') || undefined,
      pageSize: searchParams.get('pageSize') || undefined,
      sort: searchParams.get('sort') || undefined,
    }

    // Validate query parameters against schema
    const validatedParams = searchQuerySchema.parse(rawParams)

    // Execute search with validated parameters
    const result = await searchListings(validatedParams)

    // Return successful response
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    // Handle Zod validation errors
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string[]> = {}
      for (const issue of error.issues) {
        const path = issue.path.join('.')
        if (!fieldErrors[path]) {
          fieldErrors[path] = []
        }
        fieldErrors[path].push(issue.message)
      }

      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid query parameters',
            details: fieldErrors,
          },
        },
        { status: 400 },
      )
    }

    // Handle unexpected errors
    console.error('[GET /api/listings] Unexpected error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 },
    )
  }
}
