-- Migration: 20260724000000_create_listings_table.sql
-- Description: Create listings table, indexes, RLS policies, updated_at trigger,
--              and published_listings_with_rating view.
-- Depends on: 20260723000000_create_profiles_table.sql
--   (set_updated_at() function already exists from the profiles migration)

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  category text not null,
  price_cents int not null check (price_cents > 0),
  location text not null,
  lat float8,
  lng float8,
  images text[] default '{}',
  booking_mode text not null check (booking_mode in ('instant', 'request')) default 'request',
  status text not null check (status in ('draft', 'published', 'archived')) default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index idx_listings_seller_id on public.listings(seller_id);
create index idx_listings_status_category on public.listings(status, category);

-- Grant table privileges to Supabase roles (required for local dev defaults)
grant all on public.listings to anon, authenticated, service_role;

-- Enable Row-Level Security
alter table public.listings enable row level security;

-- RLS Policies
-- Published listings are publicly readable; sellers can always read their own (any status)
create policy "published listings are publicly readable"
  on public.listings for select
  using (status = 'published' or seller_id = auth.uid());

-- Sellers may only insert listings where they are the seller
create policy "sellers insert own listings"
  on public.listings for insert
  with check (seller_id = auth.uid());

-- Sellers may only update their own listings
create policy "sellers update own listings"
  on public.listings for update
  using (seller_id = auth.uid());

-- Sellers may only delete their own listings
create policy "sellers delete own listings"
  on public.listings for delete
  using (seller_id = auth.uid());

-- updated_at trigger
create trigger trg_listings_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();
