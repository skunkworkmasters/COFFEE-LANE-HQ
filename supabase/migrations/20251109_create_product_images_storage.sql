-- ============================================================================
-- Product Images Storage Setup
-- ============================================================================
-- Creates a storage bucket for product images with proper policies
-- Date: 2025-11-09
-- ============================================================================

-- Step 1: Create the storage bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true, -- Public bucket so images can be accessed via URL
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create storage policies for product-images bucket

-- Allow authenticated users to view all product images (public read)
CREATE POLICY "Anyone can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- Allow admins to upload product images
CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images' AND
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Allow admins to update product images
CREATE POLICY "Admins can update product images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-images' AND
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Allow admins to delete product images
CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'product-images' AND
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 'Product images storage bucket created successfully!' as status;

-- Verify bucket exists:
-- SELECT * FROM storage.buckets WHERE id = 'product-images';

-- Check policies:
-- SELECT * FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';
