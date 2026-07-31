-- Migration: 20260731000000_grant_availability_slots_privileges.sql
-- Description: Grant table privileges on availability_slots to Supabase roles.
--              The original slots migration (20260725000001) omitted the explicit
--              GRANT that the listings and bookings migrations include. Without it,
--              the standalone webhook service (service_role) could update bookings
--              but got "permission denied for table availability_slots" when marking
--              the slot booked — a confirmed payment could leave the slot unbooked.
-- Depends on: 20260725000001_create_availability_slots_table.sql

grant all on public.availability_slots to anon, authenticated, service_role;
