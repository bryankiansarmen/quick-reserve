-- Add updated_at column to availability_slots table
-- Supports future slot editing capability

alter table availability_slots 
  add column updated_at timestamptz not null default now();

-- Reuse existing set_updated_at() function from profiles migration
create trigger trg_availability_slots_updated_at
  before update on availability_slots
  for each row
  execute function set_updated_at();

-- Verify trigger exists
comment on trigger trg_availability_slots_updated_at on availability_slots is 
  'Auto-updates updated_at timestamp on row modification';
