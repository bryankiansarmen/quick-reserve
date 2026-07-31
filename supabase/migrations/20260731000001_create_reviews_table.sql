-- Migration: 20260731000001_create_reviews_table.sql
-- Description: Create reviews table, indexes, RLS policies, and the
--              published_listings_with_rating view.
-- Depends on: 20260723000000_create_profiles_table.sql (profiles),
--             20260724000000_create_listings_table.sql (listings),
--             20260730000000_create_bookings_table.sql (bookings)

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete restrict,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_reviews_reviewer_id on public.reviews(reviewer_id);

-- View: aggregate ratings per published listing.
-- Runs with definer (owner) privileges, so the
-- aggregate is consistent for every caller. Anonymous users have no SELECT
-- policy on bookings, so a security_invoker view would zero-out review_count
-- for them — defeating the public ratings display on search/detail pages.
-- The view only exposes listing columns (already publicly readable when
-- published) plus rating aggregates; it never exposes review comment text.
create view public.published_listings_with_rating as
select l.*,
       coalesce(avg(r.rating), 0) as avg_rating,
       count(r.id) as review_count
from public.listings l
left join public.bookings b on b.listing_id = l.id
left join public.reviews r on r.booking_id = b.id
where l.status = 'published'
group by l.id;

-- Grant table privileges to Supabase roles (required for local dev defaults)
grant all on public.reviews to anon, authenticated, service_role;
grant select on public.published_listings_with_rating to anon, authenticated, service_role;

-- Enable Row-Level Security
alter table public.reviews enable row level security;

-- RLS Policies
-- Reviews are publicly readable: they serve as social proof on listings.
create policy "reviews are publicly readable"
  on public.reviews for select
  using (true);

-- Only the buyer of a completed booking may create a review for it, and only
-- as themselves. Combined with the unique constraint on booking_id, a review can only be created for a status='completed'
-- booking, at most one review per booking.
create policy "buyers review own completed bookings"
  on public.reviews for insert
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.bookings b
      where b.id = reviews.booking_id
      and b.buyer_id = auth.uid()
      and b.status = 'completed'
    )
  );
