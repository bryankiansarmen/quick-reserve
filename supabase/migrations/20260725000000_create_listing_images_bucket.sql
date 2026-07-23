-- Migration: 20260725000000_create_listing_images_bucket.sql
-- Description: Create listing-images storage bucket with RLS policies

-- Create the bucket in storage.buckets if it does not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-images',
  'listing-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS Policies on storage.objects

-- Allow public read access to all images in listing-images
CREATE POLICY "Public read access for listing-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-images');

-- Allow authenticated users to upload images to listing-images
CREATE POLICY "Authenticated users can upload listing-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'listing-images');

-- Allow authenticated users to update their own uploaded images in listing-images
-- Assuming file path structure is {seller_id}/{filename}
CREATE POLICY "Users can update own listing-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own uploaded images in listing-images
CREATE POLICY "Users can delete own listing-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'listing-images' AND auth.uid()::text = (storage.foldername(name))[1]);
