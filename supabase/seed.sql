-- Seed: quick-reserve local dev test data
-- Runs automatically after migrations on: npx supabase db reset
--
-- Creates: 2 sellers, 1 buyer, 4 listings, availability slots (some booked).
-- Passwords for all seed users: password123

-- Enable pgcrypto for crypt()
create extension if not exists pgcrypto with schema public;

-- Seed auth.users --------------------------------------------------------------
-- The handle_new_user() trigger on auth.users auto-creates profiles rows.
-- We insert auth users and then update profiles to add seller roles.
--
-- NOTE: GoTrue v2.193+ requires: instance_id, aud, role to be non-null,
-- and a corresponding row in auth.identities for login to work.

INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, phone, phone_change, phone_change_token, email_change_token_current, reauthentication_token, raw_user_meta_data, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'alice@example.com', crypt('password123', gen_salt('bf', 10)), now(), '', '', '', '', '+15551230001', '', '', '', '', jsonb_build_object('full_name', 'Alice Johnson'), now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'bob@example.com',   crypt('password123', gen_salt('bf', 10)), now(), '', '', '', '', '+15551230002', '', '', '', '', jsonb_build_object('full_name', 'Bob Smith'),   now(), now()),
  ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', 'carol@example.com', crypt('password123', gen_salt('bf', 10)), now(), '', '', '', '', '+15551230003', '', '', '', '', jsonb_build_object('full_name', 'Carol Davis'), now(), now());

-- Seed auth.identities ---------------------------------------------------------
-- GoTrue requires an identity row for each email/password user.
INSERT INTO auth.identities (provider, provider_id, identity_data, user_id, last_sign_in_at, created_at, updated_at)
SELECT 'email', id, jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true), id, now(), now(), now()
FROM auth.users
WHERE email IN ('alice@example.com', 'bob@example.com', 'carol@example.com');

-- Update auto-created profiles to add seller roles -----------------------------
UPDATE public.profiles
SET roles = ARRAY['buyer', 'seller'], bio = 'Professional space host.'
WHERE id IN (SELECT id FROM auth.users WHERE email IN ('alice@example.com', 'bob@example.com'));

-- Seed listings ----------------------------------------------------------------

DO $$
DECLARE
  alice_id uuid;
  bob_id   uuid;
  listing1_id uuid;
  listing2_id uuid;
  listing3_id uuid;
  listing4_id uuid;
  slot_start timestamptz;
BEGIN
  SELECT id INTO alice_id FROM auth.users WHERE email = 'alice@example.com';
  SELECT id INTO bob_id   FROM auth.users WHERE email = 'bob@example.com';

  INSERT INTO listings (seller_id, title, description, category, price_cents, location, booking_mode, status)
  VALUES (
    alice_id,
    'Sunlit Photography Studio — Downtown',
    'Bright natural-light studio with white cyc wall, Profoto strobes, C-stands, backdrops, and a changing room. Ideal for portraits, product shots, and small video productions.',
    'photography-studio',
    8500,
    'Downtown',
    'instant',
    'published'
  )
  RETURNING id INTO listing1_id;

  INSERT INTO listings (seller_id, title, description, category, price_cents, location, booking_mode, status)
  VALUES (
    alice_id,
    'Cozy Garden Event Space',
    'Charming 500 sqft garden pavilion with string lights, picnic tables, and a catering prep area. Perfect for birthday parties, baby showers, and intimate weddings up to 30 guests.',
    'event-venue',
    15000,
    'Midtown',
    'request',
    'published'
  )
  RETURNING id INTO listing2_id;

  INSERT INTO listings (seller_id, title, description, category, price_cents, location, booking_mode, status)
  VALUES (
    bob_id,
    'Modern Kitchen for Cooking Classes',
    'Professional-grade kitchen with 6-burner Wolf range, dual ovens, walk-in cooler, prep stations for 12 students, and overhead mirrors. Inspected and licensed for commercial food prep.',
    'meeting-room',
    20000,
    'East Side',
    'instant',
    'published'
  )
  RETURNING id INTO listing3_id;

  INSERT INTO listings (seller_id, title, description, category, price_cents, location, booking_mode, status)
  VALUES (
    bob_id,
    'Peaceful Yoga Loft',
    'Sun-drenched 800 sqft loft with bamboo flooring, floor-to-ceiling mirrors, essential oil diffusers, and 20 yoga mats + blocks. Heated floors for winter practice.',
    'activity-space',
    6000,
    'West End',
    'request',
    'published'
  )
  RETURNING id INTO listing4_id;

  -- Availability slots: 6–10 future slots per listing at 1–3 hour intervals -----

  -- Listing 1: Photography Studio (Alice) — 10 slots
  FOR i IN 0..9 LOOP
    slot_start := date_trunc('day', now()) + interval '1 day' * (i + 1) + time '09:00';
    INSERT INTO availability_slots (listing_id, start_time, end_time, is_booked)
    VALUES (listing1_id, slot_start, slot_start + interval '2 hours', i < 3);
  END LOOP;

  -- Listing 2: Garden Event Space (Alice) — 6 half-day slots
  FOR i IN 0..5 LOOP
    slot_start := date_trunc('day', now()) + interval '1 day' * (i + 2) + time '10:00';
    INSERT INTO availability_slots (listing_id, start_time, end_time, is_booked)
    VALUES (listing2_id, slot_start, slot_start + interval '4 hours', i < 2);
  END LOOP;

  -- Listing 3: Cooking Kitchen (Bob) — 8 slots
  FOR i IN 0..7 LOOP
    slot_start := date_trunc('day', now()) + interval '1 day' * (i + 1) + time '14:00';
    INSERT INTO availability_slots (listing_id, start_time, end_time, is_booked)
    VALUES (listing3_id, slot_start, slot_start + interval '3 hours', i < 2);
  END LOOP;

  -- Listing 4: Yoga Loft (Bob) — 8 slots
  FOR i IN 0..7 LOOP
    slot_start := date_trunc('day', now()) + interval '1 day' * (i + 1) + time '07:00';
    INSERT INTO availability_slots (listing_id, start_time, end_time, is_booked)
    VALUES (listing4_id, slot_start, slot_start + interval '1.5 hours', i < 2);
  END LOOP;

END $$;
