-- ============================================================================
-- Product Pool System Migration
-- ============================================================================
-- Creates a pool of products that admins manage and tenants can select from
-- Date: 2025-11-09
-- ============================================================================

-- Step 1: Create product_category enum
CREATE TYPE public.product_category AS ENUM (
  'breakfast',
  'brunch',
  'lunch',
  'afternoon',
  'dinner',
  'all day'
);

-- Step 2: Create product_pool table (managed by admins)
CREATE TABLE IF NOT EXISTS public.product_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category public.product_category NOT NULL,
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_pool_category ON public.product_pool(category);
CREATE INDEX IF NOT EXISTS idx_product_pool_name ON public.product_pool(name);
CREATE INDEX IF NOT EXISTS idx_product_pool_created_at ON public.product_pool(created_at DESC);

-- Step 4: Modify existing products table to reference product_pool
-- First, check if we need to add the pool reference
DO $$
BEGIN
  -- Add product_pool_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'products'
    AND column_name = 'product_pool_id'
  ) THEN
    ALTER TABLE public.products
    ADD COLUMN product_pool_id UUID REFERENCES public.product_pool(id) ON DELETE SET NULL;
  END IF;

  -- Add quantity column if it doesn't exist (for inventory)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'products'
    AND column_name = 'quantity'
  ) THEN
    ALTER TABLE public.products
    ADD COLUMN quantity INTEGER DEFAULT NULL; -- NULL means unlimited
  END IF;
END $$;

-- Step 5: Create index on product_pool_id
CREATE INDEX IF NOT EXISTS idx_products_pool_id ON public.products(product_pool_id);

-- Step 6: Enable RLS on product_pool
ALTER TABLE public.product_pool ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS policies for product_pool

-- Admins can manage all products in the pool
CREATE POLICY "Admins can manage product pool"
  ON public.product_pool
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Tenants can view the product pool to select from
CREATE POLICY "Tenants can view product pool"
  ON public.product_pool
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'tenant'::public.app_role) OR
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );

-- Step 8: Create trigger for updated_at on product_pool
DROP TRIGGER IF EXISTS update_product_pool_updated_at ON public.product_pool;
CREATE TRIGGER update_product_pool_updated_at
  BEFORE UPDATE ON public.product_pool
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Step 9: Create view for product pool with stats
CREATE OR REPLACE VIEW public.product_pool_stats AS
SELECT
  pp.*,
  COUNT(DISTINCT p.tenant_id) as tenant_count,
  COUNT(p.id) as products_using_count
FROM public.product_pool pp
LEFT JOIN public.products p ON p.product_pool_id = pp.id
GROUP BY pp.id;

-- Grant access to the view
GRANT SELECT ON public.product_pool_stats TO authenticated;

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 'Product pool migration completed successfully!' as status;

-- Run these queries to verify:
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'public.product_category'::regtype;
-- SELECT * FROM public.product_pool;
-- SELECT * FROM public.product_pool_stats;
