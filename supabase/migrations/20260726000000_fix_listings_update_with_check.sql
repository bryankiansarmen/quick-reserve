-- Migration: 20260726000000_fix_listings_update_with_check.sql
-- Description: Fix UPDATE policy to prevent seller_id manipulation
-- Context: Original policy missing WITH CHECK clause allowed ownership transfers
-- Date: 2026-07-26

-- Drop and recreate the UPDATE policy with WITH CHECK
DROP POLICY IF EXISTS "sellers update own listings" ON public.listings;

CREATE POLICY "sellers update own listings"
  ON public.listings FOR UPDATE
  USING (seller_id = auth.uid())
  WITH CHECK (seller_id = auth.uid());

-- Add comment documenting the fix
COMMENT ON POLICY "sellers update own listings" ON public.listings IS
  'Sellers can update their own listings. WITH CHECK prevents seller_id changes.';
