-- ============================================================================
-- Add "All Day" Category to Product Pool
-- ============================================================================
-- This migration adds the 'all day' category to the existing product_category enum
-- Date: 2025-11-09
-- ============================================================================

-- Step 1: Add 'all day' to the product_category enum if it doesn't exist
DO $$
BEGIN
  -- Check if 'all day' value exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.product_category'::regtype
    AND enumlabel = 'all day'
  ) THEN
    -- Add the new enum value
    ALTER TYPE public.product_category ADD VALUE 'all day';
    RAISE NOTICE 'Added "all day" to product_category enum';
  ELSE
    RAISE NOTICE '"all day" already exists in product_category enum';
  END IF;
END $$;

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 'All day category added successfully!' as status;

-- Verify the enum values:
SELECT enumlabel as category
FROM pg_enum
WHERE enumtypid = 'public.product_category'::regtype
ORDER BY enumsortorder;
