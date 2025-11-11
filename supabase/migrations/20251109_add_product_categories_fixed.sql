-- Create product categories table (FIXED - handles existing objects)
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories (only if they don't exist)
INSERT INTO public.product_categories (name, slug, description, sort_order) VALUES
  ('Hot Drinks', 'hot-drinks', 'Coffee, tea, hot chocolate, and other hot beverages', 1),
  ('Cold Drinks', 'cold-drinks', 'Iced coffee, cold brew, smoothies, and cold beverages', 2),
  ('Main Dishes / Entrées', 'main-dishes', 'Main course meals and entrées', 3),
  ('Side Dishes', 'side-dishes', 'Side dishes and accompaniments', 4),
  ('Soups', 'soups', 'Hot and cold soups', 5),
  ('Salads', 'salads', 'Fresh salads and salad bowls', 6),
  ('Sandwiches / Wraps', 'sandwiches-wraps', 'Sandwiches, wraps, and paninis', 7),
  ('Breakfast Items', 'breakfast', 'Breakfast foods and morning specials', 8),
  ('Appetizers / Starters', 'appetizers', 'Starters and small plates', 9),
  ('Baked Goods', 'baked-goods', 'Breads, muffins, croissants, and pastries', 10),
  ('Desserts', 'desserts', 'Cakes, pies, and sweet treats', 11),
  ('Sweets / Confectionery', 'sweets', 'Candies, chocolates, and confectionery', 12),
  ('Snacks', 'snacks', 'Light snacks and quick bites', 13),
  ('Kids Menu', 'kids-menu', 'Child-friendly meals and treats', 14),
  ('Specials / Seasonal', 'specials', 'Limited time offers and seasonal items', 15),
  ('Combos / Meal Deals', 'combos', 'Combo meals and value deals', 16),
  ('Bottled / Packaged Items', 'packaged', 'Pre-packaged and bottled items', 17),
  ('Retail / Merchandise', 'retail', 'Retail products and merchandise', 18)
ON CONFLICT (slug) DO NOTHING;

-- Create junction table for product-category relationship (many-to-many)
CREATE TABLE IF NOT EXISTS public.product_pool_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_pool_id UUID NOT NULL REFERENCES public.product_pool(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.product_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_pool_id, category_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_pool_categories_product ON public.product_pool_categories(product_pool_id);
CREATE INDEX IF NOT EXISTS idx_product_pool_categories_category ON public.product_pool_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_sort_order ON public.product_categories(sort_order);

-- Add RLS policies for product_categories (readable by all authenticated users)
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read product categories" ON public.product_categories;
DROP POLICY IF EXISTS "Admins can manage product categories" ON public.product_categories;

-- Create policies
CREATE POLICY "Anyone can read product categories"
  ON public.product_categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Admin can manage categories
CREATE POLICY "Admins can manage product categories"
  ON public.product_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Add RLS policies for product_pool_categories
ALTER TABLE public.product_pool_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can read product pool categories" ON public.product_pool_categories;
DROP POLICY IF EXISTS "Admins can manage product pool categories" ON public.product_pool_categories;

-- Create policies
CREATE POLICY "Anyone can read product pool categories"
  ON public.product_pool_categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Admin can manage product pool categories
CREATE POLICY "Admins can manage product pool categories"
  ON public.product_pool_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Add updated_at trigger for product_categories
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_product_categories_updated_at ON public.product_categories;
CREATE TRIGGER update_product_categories_updated_at
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.product_categories IS 'Product categories for organizing menu items';
COMMENT ON TABLE public.product_pool_categories IS 'Junction table linking products to categories (many-to-many)';
COMMENT ON COLUMN public.product_categories.sort_order IS 'Order in which categories should be displayed';

SELECT 'Product categories migration completed successfully!' as status;
