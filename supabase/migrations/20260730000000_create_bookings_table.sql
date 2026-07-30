-- Migration: 20260730000000_create_bookings_table.sql
-- Description: Create bookings table, indexes, RLS policies, updated_at trigger,
--              and one_active_booking_per_slot constraint for double-booking prevention.
-- Depends on: 20260723000000_create_profiles_table.sql (profiles),
--             20260724000000_create_listings_table.sql (listings),
--             20260725000001_create_availability_slots_table.sql (availability_slots)
--   (set_updated_at() function already exists from the profiles migration)

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  buyer_id uuid not null references public.profiles(id),
  slot_id uuid not null references public.availability_slots(id),
  status text not null check (status in ('pending', 'confirmed', 'cancelled', 'completed')) default 'pending',
  stripe_payment_intent_id text unique,
  amount_cents int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Partial unique index for double-booking prevention.
-- A slot may only have one non-cancelled booking at a time. A table constraint
-- with nulls not distinct doesn't accept expressions, so we use a partial
-- unique index instead. Cancelled rows are excluded from the index, so multiple
-- cancelled records per slot are allowed while double-booking is prevented.
create unique index uq_one_active_booking_per_slot
  on public.bookings(slot_id)
  where status <> 'cancelled';

-- Indexes
create index idx_bookings_buyer_id on public.bookings(buyer_id);
create index idx_bookings_listing_id on public.bookings(listing_id);
create index idx_bookings_status on public.bookings(status);
create index idx_bookings_stripe_payment_intent_id on public.bookings(stripe_payment_intent_id);

-- Grant table privileges to Supabase roles (required for local dev defaults)
grant all on public.bookings to anon, authenticated, service_role;

-- Enable Row-Level Security
alter table public.bookings enable row level security;

-- RLS Policies
-- Buyers can only read their own bookings
create policy "buyers read own bookings"
  on public.bookings for select
  using (buyer_id = auth.uid());

-- Sellers can read bookings on their own listings
create policy "sellers read bookings on own listings"
  on public.bookings for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = bookings.listing_id
      and l.seller_id = auth.uid()
    )
  );

-- Buyers may only insert bookings where they are the buyer
create policy "buyers create own bookings"
  on public.bookings for insert
  with check (buyer_id = auth.uid());

-- Sellers may update booking status on their own listings
-- Note: the standalone Express webhook service updates booking status using the
-- service-role key, which bypasses RLS entirely.
-- This policy covers the Seller accept/decline UI path, a separate case.
create policy "sellers update booking status on own listings"
  on public.bookings for update
  using (
    exists (
      select 1 from public.listings l
      where l.id = bookings.listing_id
      and l.seller_id = auth.uid()
    )
  );

-- updated_at trigger
create trigger trg_bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();
