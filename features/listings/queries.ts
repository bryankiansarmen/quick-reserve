import { createClient } from '@/lib/supabase/server'
import type {
  ListingSearchParams,
  ListingSearchResult,
  PaginatedListingsResponse,
} from './types'

/**
 * Search published listings with filters, sorting, and pagination.
 *
 * Features:
 * - Filters by category, location (ILIKE), price range, and availability date
 * - Supports multiple sort orders: price_asc, price_desc, rating_desc, newest
 * - Implements offset-based pagination
 * - Returns placeholder ratings (0) (bookings/reviews) is complete
 *
 * TODO: Switch to published_listings_with_rating view once bookings and
 * reviews tables exist. This will populate
 * real avg_rating and review_count values instead of zeros.
 */
export async function searchListings(
  params: ListingSearchParams,
): Promise<PaginatedListingsResponse> {
  const supabase = await createClient()

  const {
    category,
    location,
    minPrice,
    maxPrice,
    date,
    page = 1,
    pageSize = 20,
    sort = 'newest',
  } = params

  // Base query: published listings only, with exact count
  let query = supabase
    .from('listings')
    .select(
      'id, title, price_cents, location, images, created_at',
      { count: 'exact' },
    )
    .eq('status', 'published')

  // Apply category filter
  if (category) {
    query = query.eq('category', category)
  }

  // Apply location filter (case-insensitive partial match)
  if (location) {
    // Escape special LIKE wildcards to prevent pattern injection
    const escapedLocation = location.replace(/[%_]/g, '\\$&')
    query = query.ilike('location', `%${escapedLocation}%`)
  }

  // Apply price filters
  if (minPrice !== undefined) {
    query = query.gte('price_cents', minPrice)
  }

  if (maxPrice !== undefined) {
    query = query.lte('price_cents', maxPrice)
  }

  // Apply date filter: has at least one available (unbookable) slot on that date
  if (date) {
    // Date filter requires a join to availability_slots table
    // We use inner join to filter only listings with available slots on the given date
    const startOfDay = `${date}T00:00:00Z`
    const endOfDay = `${date}T23:59:59.999Z`

    // First, get listing IDs that have available slots on this date
    const { data: availableListingIds } = await supabase
      .from('availability_slots')
      .select('listing_id')
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay)
      .eq('is_booked', false)

    if (!availableListingIds || availableListingIds.length === 0) {
      // No listings have available slots on this date
      return {
        data: [],
        pagination: {
          page,
          pageSize,
          total: 0,
        },
      }
    }

    const listingIds = availableListingIds.map((row: { listing_id: string }) => row.listing_id)
    query = query.in('id', listingIds)
  }

  // Apply sorting
  switch (sort) {
    case 'price_asc':
      query = query.order('price_cents', { ascending: true })
      break
    case 'price_desc':
      query = query.order('price_cents', { ascending: false })
      break
    case 'rating_desc':
      // TODO: Use avg_rating from view once available
      // For now, fall through to newest (no real ratings yet)
      query = query.order('created_at', { ascending: false })
      break
    case 'newest':
    default:
      query = query.order('created_at', { ascending: false })
      break
  }

  // Apply pagination
  const offset = (page - 1) * pageSize
  query = query.range(offset, offset + pageSize - 1)

  // Execute query
  const { data, error, count } = await query

  if (error) {
    console.error('[searchListings] Supabase query error:', {
      code: error.code,
      message: error.message,
      // Only expose details in development to avoid leaking schema info
      ...(process.env.NODE_ENV === 'development' && { details: error.details }),
    })
    throw new Error('Failed to search listings')
  }

  // Transform raw rows to search result shape
  // Deduplicates listings if date filter caused multiple results from slots join
  const resultsMap = new Map<string, ListingSearchResult>()

  for (const row of data || []) {
    if (!resultsMap.has(row.id)) {
      resultsMap.set(row.id, {
        id: row.id,
        title: row.title,
        price_cents: row.price_cents,
        location: row.location,
        images: row.images || [],
        // TODO: Use real avg_rating and review_count from view
        avg_rating: 0,
        review_count: 0,
      })
    }
  }

  const results = Array.from(resultsMap.values())

  return {
    data: results,
    pagination: {
      page,
      pageSize,
      total: count || 0,
    },
  }
}
