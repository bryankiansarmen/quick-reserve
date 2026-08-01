-- Migration: 20260801000000_cancel_booking_function.sql
-- Description: Add cancel_booking() — a SECURITY DEFINER function that cancels
--              a booking and releases its slot atomically.
--
-- Why a function instead of RLS + two updates?
--   1. Atomicity: cancelling must set booking.status='cancelled' AND
--      availability_slots.is_booked=false in one transaction. A partial failure
--      would leave a cancelled booking holding a booked slot.
--   2. The Buyer cannot release a slot via RLS: availability_slots update RLS
--      reserves slot management to the listing's seller, and bookings has no
--      buyer UPDATE policy. A SECURITY DEFINER function lets the app enforce
--      the exact Buyer-OR-Seller authorization plus the business rules
--      (pending/confirmed only, before slot start) inside one guard.
--
-- Business rules enforced here:
--   - caller must be the booking's buyer or the listing's seller
--   - status must be 'pending' or 'confirmed'
--   - slot must not have started
--
-- Returns jsonb with the pre-cancel state so the route can decide on
-- downstream work (cancel the Stripe Payment Intent for 'pending', defer
-- refunds for 'confirmed', and report who cancelled for the notification).
-- Custom SQLSTATEs are surfaced verbatim by PostgREST as error.code.
-- Depends on: 20260730000000_create_bookings_table.sql (bookings),
--             20260724000000_create_listings_table.sql (listings),
--             20260725000001_create_availability_slots_table.sql (availability_slots)

create or replace function public.cancel_booking(p_booking_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings%rowtype;
  v_seller_id uuid;
  v_slot_start timestamptz;
  v_caller uuid := auth.uid();
begin
  if v_caller is null then
    raise exception 'not_authenticated' using errcode = 'BKC01';
  end if;

  select * into v_booking
  from public.bookings
  where id = p_booking_id
  for update;

  if not found then
    raise exception 'booking_not_found' using errcode = 'BKC02';
  end if;

  select seller_id into v_seller_id
  from public.listings
  where id = v_booking.listing_id;

  if v_caller <> v_booking.buyer_id and v_caller <> v_seller_id then
    raise exception 'not_authorized' using errcode = 'BKC03';
  end if;

  if v_booking.status not in ('pending', 'confirmed') then
    raise exception 'invalid_booking_status' using errcode = 'BKC04';
  end if;

  select start_time into v_slot_start
  from public.availability_slots
  where id = v_booking.slot_id;

  if v_slot_start <= now() then
    raise exception 'cancellation_window_closed' using errcode = 'BKC05';
  end if;

  update public.bookings
  set status = 'cancelled'
  where id = p_booking_id;

  update public.availability_slots
  set is_booked = false
  where id = v_booking.slot_id;

  return to_jsonb(json_build_object(
    'previous_status', v_booking.status,
    'stripe_payment_intent_id', v_booking.stripe_payment_intent_id,
    'cancelled_by', case when v_caller = v_booking.buyer_id then 'buyer' else 'seller' end
  ));
end;
$$;

-- Only authenticated users may cancel; the function itself checks ownership.
grant execute on function public.cancel_booking(uuid) to authenticated;
