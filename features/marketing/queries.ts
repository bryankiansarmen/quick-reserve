import { createClient } from '@/lib/supabase/server'
import { CATEGORY_OPTIONS } from '@/lib/constants/categories'
import type { ListingSearchResult } from '@/features/listings/types'

/**
 * Fetch the most recent published listings for the homepage "Featured Spaces"
 * section. Reads from the `published_listings_with_rating` view so ratings and
 * review counts are real (the view only includes published listings).
 */
export async function getFeaturedListings(limit = 8): Promise<ListingSearchResult[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('published_listings_with_rating')
    .select('id, title, price_cents, location, images, created_at, avg_rating, review_count')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[getFeaturedListings] Error fetching featured listings:', {
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
    avg_rating: Number(row.avg_rating ?? 0),
    review_count: Number(row.review_count ?? 0),
  }))
}

/**
 * Fetch the count of published listings per category for the homepage
 * "Browse by Category" section. Only published listings count — drafts and
 * archived listings are invisible to anonymous visitors via RLS anyway.
 */
export async function getCategoryCounts(): Promise<Record<string, number>> {
  const supabase = await createClient()

  const counts: Record<string, number> = {}

  for (const { value } of CATEGORY_OPTIONS) {
    const { count, error } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published')
      .eq('category', value)

    if (error) {
      console.error(`[getCategoryCounts] Error counting category ${value}:`, {
        code: error.code,
        message: error.message,
      })
      counts[value] = 0
      continue
    }

    counts[value] = count ?? 0
  }

  return counts
}
