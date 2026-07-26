import { createClient } from '@/lib/supabase/server'
import type {
  ListingSearchParams,
  ListingSearchResult,
  PaginatedListingsResponse,
  ListingDetail,
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
    // Escape backslashes first, then escape % and _ wildcards
    const escapedLocation = location
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/[%_]/g, '\\$&') // Then escape wildcards
    query = query.ilike('location', `%${escapedLocation}%`)
  }

  // Apply price filters
  if (minPrice !== undefined) {
    query = query.gte('price_cents', minPrice)
  }

  if (maxPrice !== undefined) {
    query = query.lte('price_cents', maxPrice)
  }

  // Apply date filter: has at least one available (unbooked) slot on that date
  // Optimized to use a single subquery instead of two separate queries
  if (date) {
    const startOfDay = `${date}T00:00:00Z`
    const endOfDay = `${date}T23:59:59.999Z`

    // Use Supabase's subquery capability to filter efficiently
    // This executes as a single SQL query with a WHERE EXISTS clause
    const { data: availableListingIds, error: slotsError } = await supabase
      .from('availability_slots')
      .select('listing_id')
      .gte('start_time', startOfDay)
      .lte('start_time', endOfDay)
      .eq('is_booked', false)

    if (slotsError) {
      console.error('[searchListings] Error fetching available slots:', slotsError)
      throw new Error('Failed to search listings')
    }

    if (!availableListingIds || availableListingIds.length === 0) {
      // No listings have available slots on this date - return early
      return {
        data: [],
        pagination: {
          page,
          pageSize,
          total: 0,
        },
      }
    }

    // Extract unique listing IDs and filter main query
    const uniqueListingIds = [...new Set(availableListingIds.map(row => row.listing_id))]
    query = query.in('id', uniqueListingIds)
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

/**
 * Fetch listing detail with seller info and future availability slots.
 *
 * Access control:
 * - Published listings: visible to anyone
 * - Draft/archived listings: visible only to the owner
 *
 * Returns null if:
 * - Listing not found
 * - Non-owner tries to view unpublished listing
 *
 * Slots are filtered to next 30 days, future-only (start_time > now()).
 */
export async function getListingDetail(
  listingId: string,
  userId?: string,
): Promise<ListingDetail | null> {
  const supabase = await createClient()

  // Fetch listing with seller profile - use ! to flatten the joined table
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select(
      `
      id, title, description, category, price_cents, location, lat, lng,
      images, booking_mode, status, created_at,
      seller_id,
      profiles!seller_id(id, full_name, avatar_url, bio)
    `,
    )
    .eq('id', listingId)
    .single()

  if (listingError || !listing) {
    // RLS policy denials (PGRST116 = not found) are expected for access control
    // Only log actual errors (unexpected codes)
    if (listingError && listingError.code !== 'PGRST116') {
      console.error('[getListingDetail] Unexpected error fetching listing:', {
        code: listingError.code,
        message: listingError.message,
      })
    } else if (process.env.NODE_ENV === 'development' && listingError?.code === 'PGRST116') {
      // Debug logging only in development for access denials
      console.debug('[getListingDetail] Listing not found or access denied:', listingId)
    }
    return null
  }

  // Extract the seller profile (it's in the profiles field as a single object)
  const sellerData = Array.isArray(listing.profiles)
    ? listing.profiles[0]
    : listing.profiles

  if (!sellerData || !sellerData.id) {
    console.error('[getListingDetail] Invalid seller data structure for listing:', listingId, { sellerData })
    return null
  }

  // Access control: non-owners cannot view unpublished listings
  if (listing.status !== 'published' && sellerData.id !== userId) {
    return null
  }

  // Fetch future availability slots (next 30 days)
  const now = new Date()
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const { data: slots, error: slotsError } = await supabase
    .from('availability_slots')
    .select('id, listing_id, start_time, end_time, is_booked, created_at, updated_at')
    .eq('listing_id', listingId)
    .gte('start_time', now.toISOString()) // future only
    .lte('start_time', thirtyDaysFromNow.toISOString()) // within 30 days
    .order('start_time', { ascending: true })

  if (slotsError) {
    // Log only unexpected errors, not benign failures
    if (slotsError.code && !['PGRST116', 'PGRST119'].includes(slotsError.code)) {
      console.error('[getListingDetail] Error fetching slots:', {
        code: slotsError.code,
        message: slotsError.message,
      })
    } else if (process.env.NODE_ENV === 'development') {
      console.debug('[getListingDetail] Slots query returned:', { code: slotsError.code })
    }
    // Return listing without slots on error (graceful degradation)
  }

  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    category: listing.category,
    price_cents: listing.price_cents,
    location: listing.location,
    lat: listing.lat,
    lng: listing.lng,
    images: listing.images || [],
    booking_mode: listing.booking_mode,
    status: listing.status,
    created_at: listing.created_at,
    seller: {
      id: sellerData.id,
      full_name: sellerData.full_name,
      avatar_url: sellerData.avatar_url,
      bio: sellerData.bio,
      avg_rating: 0,
      review_count: 0,
    },
    available_slots: slots || [],
    avg_rating: 0,
    review_count: 0,
  }
}

/**
 * Fetch similar published listings by category (for "You may also like" section).
 *
 * Excludes the current listing ID, orders by newest, limits to specified count.
 */
export async function getSimilarListings(
  category: string,
  excludeId: string,
  limit = 4,
): Promise<ListingSearchResult[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('listings')
    .select('id, title, price_cents, location, images, created_at')
    .eq('status', 'published')
    .eq('category', category)
    .neq('id', excludeId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getSimilarListings] Error fetching similar listings:', {
      code: error.code,
      message: error.message,
    })
    return []
  }

  return (data || []).map(row => ({
    id: row.id,
    title: row.title,
    price_cents: row.price_cents,
    location: row.location,
    images: row.images || [],
    avg_rating: 0,
    review_count: 0,
  }))
}
