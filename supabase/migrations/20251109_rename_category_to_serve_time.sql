-- Rename product_pool category to serve_time
-- This distinguishes it from the new product_categories system

-- Step 1: Rename the ENUM type
ALTER TYPE public.product_category RENAME TO serve_time_enum;

-- Step 2: Rename the column in product_pool table
ALTER TABLE public.product_pool
  RENAME COLUMN category TO serve_time;

-- Step 3: Update the index name
DROP INDEX IF EXISTS idx_product_pool_category;
CREATE INDEX IF NOT EXISTS idx_product_pool_serve_time ON public.product_pool(serve_time);

-- Step 4: Verify the change
COMMENT ON COLUMN public.product_pool.serve_time IS 'Time of day when this product is typically served (breakfast, brunch, lunch, afternoon, dinner, all day)';
COMMENT ON TYPE public.serve_time_enum IS 'Enum for product serve time categories';

SELECT 'Category renamed to serve_time successfully!' as status;
