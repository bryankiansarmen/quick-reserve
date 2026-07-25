-- Enable btree_gist extension (required for no_overlapping_slots constraint)
create extension if not exists btree_gist;

-- Create availability_slots table
create table availability_slots (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null check (end_time > start_time),
  is_booked boolean not null default false,
  created_at timestamptz not null default now(),
  -- Prevents overlapping slots for the same listing using the && operator
  constraint no_overlapping_slots exclude using gist (
    listing_id with =,
    tstzrange(start_time, end_time) with &&
  )
);

-- Indexes
create index idx_availability_slots_listing_id on availability_slots(listing_id);
create index idx_availability_slots_start_time on availability_slots(start_time);

-- Enable RLS
alter table availability_slots enable row level security;

-- Grant permissions
grant select on availability_slots to anon, authenticated;
grant insert, update, delete on availability_slots to authenticated;

-- RLS Policy 1: SELECT - slots readable if parent listing is readable
create policy "slots readable with listing"
  on availability_slots for select using (
    exists (
      select 1 from listings l
      where l.id = availability_slots.listing_id
      and (l.status = 'published' or l.seller_id = auth.uid())
    )
  );

-- RLS Policy 2: INSERT/UPDATE/DELETE - only listing owner can manage slots
create policy "sellers manage own listing slots"
  on availability_slots for all using (
    exists (
      select 1 from listings l
      where l.id = availability_slots.listing_id
      and l.seller_id = auth.uid()
    )
  );
