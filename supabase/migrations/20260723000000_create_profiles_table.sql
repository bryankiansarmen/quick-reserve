-- Migration: 20260723000000_create_profiles_table.sql
-- Description: Create profiles table, set updated_at trigger, enable RLS, and add auth.users auto-create trigger.

create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null default '',
  avatar_url text,
  roles text[] not null default '{buyer}',
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Grant table privileges to Supabase roles
grant usage on schema public to anon, authenticated, service_role;
grant all on public.profiles to anon, authenticated, service_role;

-- Enable Row-Level Security
alter table public.profiles enable row level security;

-- RLS Policies
create policy "profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Function and trigger for updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Function and trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, roles)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      split_part(coalesce(new.email, ''), '@', 1),
      ''
    ),
    nullif(new.raw_user_meta_data->>'avatar_url', ''),
    array['buyer']
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
