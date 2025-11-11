# Product Image Upload - Supabase Storage

## Overview

Product images are now uploaded to **Supabase Storage** instead of using external URLs. This provides:
- ✅ Centralized image storage
- ✅ Better security and access control
- ✅ Automatic CDN delivery
- ✅ File validation (type and size)
- ✅ Image preview before upload

## Setup Instructions

### 1. Apply Storage Migration

Run in **Supabase SQL Editor**:

```sql
-- Copy and paste contents from:
supabase/migrations/20251109_create_product_images_storage.sql
```

This creates:
- `product-images` storage bucket (public, 5MB limit)
- RLS policies for admin-only uploads
- Public read access for all images

### 2. Verify Bucket Creation

```sql
SELECT * FROM storage.buckets WHERE id = 'product-images';
```

Should show:
- `name`: product-images
- `public`: true
- `file_size_limit`: 5242880 (5MB)
- `allowed_mime_types`: image/jpeg, image/jpg, image/png, image/webp, image/gif

## How It Works

### Admin Workflow

1. **Navigate to Admin Dashboard** → Product Pool tab
2. Click **"Add Product"** or **"Edit"** existing product
3. In the dialog:
   - Click **"Choose File"** under "Product Image"
   - Select an image file from your computer
   - See **instant preview** of the image
   - Click **"Create Product"** or **"Update Product"**
4. Image is **automatically uploaded** to Supabase Storage
5. Product saves with storage URL

### File Validation

**Accepted formats:**
- JPEG/JPG
- PNG
- WebP
- GIF

**Size limit:**
- Maximum 5MB per image

**Validation errors:**
- "Invalid File" - if not an image
- "File Too Large" - if exceeds 5MB

### Image Storage Structure

Images are stored in Supabase Storage with unique filenames:

```
product-images/
  ├── abc123-1699123456789.jpg
  ├── def456-1699123457890.png
  └── ghi789-1699123458901.webp
```

Format: `{random-id}-{timestamp}.{extension}`

### Public URLs

After upload, images are accessible via public URL:

```
https://your-project.supabase.co/storage/v1/object/public/product-images/abc123-1699123456789.jpg
```

## Technical Details

### Storage Bucket Configuration

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,                    -- Public access
  5242880,                 -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
);
```

### RLS Policies

**Public Read:**
```sql
CREATE POLICY "Anyone can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');
```

**Admin Upload:**
```sql
CREATE POLICY "Admins can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images' AND
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );
```

**Admin Update/Delete:**
- Only admins can modify or delete images
- Prevents unauthorized changes

### Upload Process

1. **File Selection**
   ```typescript
   const handleImageChange = (e: any) => {
     const file = e.target.files?.[0];
     // Validate type and size
     setImageFile(file);
     // Generate preview
   }
   ```

2. **File Upload**
   ```typescript
   const uploadImage = async (file: File) => {
     // Generate unique filename
     const fileName = `${Math.random()...}-${Date.now()}.${ext}`;

     // Upload to Supabase Storage
     await supabase.storage
       .from("product-images")
       .upload(fileName, file);

     // Get public URL
     const { publicUrl } = supabase.storage
       .from("product-images")
       .getPublicUrl(fileName);

     return publicUrl;
   }
   ```

3. **Save to Database**
   ```typescript
   await supabase.from("product_pool").insert({
     name, description, category,
     image_url: publicUrl  // Storage URL
   });
   ```

### Component Updates

**ProductPoolManagement.tsx:**
- Added file input with `type="file"`
- Image preview functionality
- Upload progress indicator
- Automatic upload on form submit
- File validation (type & size)

**TenantProductSelection.tsx:**
- No changes needed
- Automatically uses storage URLs
- Images load from Supabase CDN

## UI Features

### Image Preview

When admin selects an image:
```jsx
{imagePreview && (
  <div className="mt-3">
    <img
      src={imagePreview}
      alt="Preview"
      className="w-32 h-32 object-cover rounded border"
    />
  </div>
)}
```

### Upload Progress

Shows "Uploading image..." during upload:
```jsx
{uploading && (
  <p className="text-sm text-primary mt-2">Uploading image...</p>
)}
```

### File Input

Standard HTML5 file input with image filter:
```jsx
<Input
  type="file"
  accept="image/*"
  onChange={handleImageChange}
  className="cursor-pointer"
/>
```

## Security

### Access Control

- **Public Read**: Anyone can view product images
- **Admin Only Upload**: Only admins can add images
- **Admin Only Modify**: Only admins can update/delete

### File Validation

**Client-side:**
- File type check (must be image/*)
- Size limit check (max 5MB)

**Server-side:**
- Supabase Storage validates MIME types
- Bucket enforces size limit

### Best Practices

1. **Always validate** file type and size
2. **Generate unique filenames** to prevent conflicts
3. **Use public URLs** for easy access
4. **Set appropriate cache headers** (3600s)
5. **Handle upload errors** gracefully

## Migration from URLs

If you have existing products with external URLs:

### Option 1: Keep Existing URLs
- No action needed
- New products use Supabase Storage
- Old products keep external URLs

### Option 2: Migrate to Storage

1. Download external images
2. Upload to Supabase Storage
3. Update `image_url` in `product_pool` table

```sql
-- Update product with new storage URL
UPDATE product_pool
SET image_url = 'https://your-project.supabase.co/storage/v1/object/public/product-images/new-file.jpg'
WHERE id = 'product-id';
```

## Troubleshooting

### Issue: "Upload Error" when creating product

**Cause**: Storage bucket doesn't exist or policies not set

**Solution**:
```sql
-- Verify bucket exists
SELECT * FROM storage.buckets WHERE id = 'product-images';

-- Verify policies
SELECT * FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects';
```

### Issue: Images not loading

**Cause**: Bucket not public or wrong URL

**Solution**:
1. Verify bucket is public: `public = true`
2. Check URL format: `https://.../storage/v1/object/public/product-images/...`

### Issue: "File Too Large" error

**Cause**: Image exceeds 5MB limit

**Solution**:
- Compress image before upload
- Use image optimization tools
- Or increase bucket limit (not recommended)

### Issue: Can't upload images (permission denied)

**Cause**: Not logged in as admin

**Solution**:
```sql
-- Verify admin role
SELECT role FROM user_roles WHERE user_id = auth.uid();
-- Should return 'admin'
```

## File Locations

- **Migration**: [supabase/migrations/20251109_create_product_images_storage.sql](supabase/migrations/20251109_create_product_images_storage.sql)
- **Admin Component**: [src/components/ProductPoolManagement.tsx](src/components/ProductPoolManagement.tsx)
- **Tenant Component**: [src/components/TenantProductSelection.tsx](src/components/TenantProductSelection.tsx)

## Summary

Product images now use Supabase Storage:
- ✅ Secure admin-only uploads
- ✅ Public CDN delivery
- ✅ File validation
- ✅ Automatic URL generation
- ✅ Image preview
- ✅ 5MB limit per image

Upload once in Admin Dashboard, images appear everywhere automatically! 🎉
