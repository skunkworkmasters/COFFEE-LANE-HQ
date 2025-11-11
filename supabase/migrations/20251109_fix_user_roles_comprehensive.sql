-- ============================================================================
-- Comprehensive Fix for User Roles and Enum Conflicts
-- ============================================================================
-- This migration fixes the enum conflict and ensures proper table structure
-- Date: 2025-11-09
-- ============================================================================

-- Step 1: Drop all policies that depend on has_role function
DO $$
BEGIN
  -- Drop tenant policies
  DROP POLICY IF EXISTS "Admins can manage all tenants" ON public.tenants;
  DROP POLICY IF EXISTS "Tenant users can view their tenant" ON public.tenants;

  -- Drop user_roles policies
  DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
  DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

  -- Drop product policies
  DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;
  DROP POLICY IF EXISTS "Tenant users can view their products" ON public.products;
  DROP POLICY IF EXISTS "Tenant users can manage their products" ON public.products;

  -- Drop product portions policies
  DROP POLICY IF EXISTS "Admins can manage all portions" ON public.product_portions;
  DROP POLICY IF EXISTS "Tenant users can view their portions" ON public.product_portions;

  -- Drop order policies
  DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
  DROP POLICY IF EXISTS "Tenant users can view their orders" ON public.orders;
  DROP POLICY IF EXISTS "Tenant users can create their orders" ON public.orders;

  -- Drop order items policies
  DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;
  DROP POLICY IF EXISTS "Tenant users can view their order items" ON public.order_items;
  DROP POLICY IF EXISTS "Tenant users can create their order items" ON public.order_items;

  -- Drop profile policies
  DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
  DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
END $$;

-- Step 2: Drop the conflicting functions
DROP FUNCTION IF EXISTS public.has_role(UUID, public.user_role);
DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role);
DROP FUNCTION IF EXISTS public.has_role(public.app_role, UUID);
DROP FUNCTION IF EXISTS public.has_role(public.user_role, UUID);
DROP FUNCTION IF EXISTS has_role(user_role, UUID);
DROP FUNCTION IF EXISTS has_role(app_role, UUID);

-- Step 3: Ensure the app_role enum has all necessary values
DO $$
BEGIN
  -- Check if app_role enum exists, if not create it
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'tenant', 'user');
  ELSE
    -- Add 'user' value if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = 'public.app_role'::regtype
      AND enumlabel = 'user'
    ) THEN
      ALTER TYPE public.app_role ADD VALUE 'user';
    END IF;
  END IF;
END $$;

-- Step 4: Ensure user_roles table exists and has correct structure
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON public.user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Step 6: Create the has_role function with correct signature
-- Note: Parameters are (_user_id, _role) to match existing code
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

-- Step 7: Recreate get_user_tenant_id function
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Step 8: Enable RLS on user_roles if not already enabled
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 9: Recreate all RLS policies with correct type casting

-- Tenants policies
CREATE POLICY "Admins can manage all tenants" ON public.tenants
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Tenant users can view their tenant" ON public.tenants
  FOR SELECT USING (id = public.get_user_tenant_id(auth.uid()));

-- User roles policies
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

-- Products policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
    EXECUTE 'CREATE POLICY "Admins can manage all products" ON public.products
      FOR ALL USING (public.has_role(auth.uid(), ''admin''::public.app_role))';

    EXECUTE 'CREATE POLICY "Tenant users can view their products" ON public.products
      FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()))';

    EXECUTE 'CREATE POLICY "Tenant users can manage their products" ON public.products
      FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()))';
  END IF;
END $$;

-- Product portions policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_portions') THEN
    EXECUTE 'CREATE POLICY "Admins can manage all portions" ON public.product_portions
      FOR ALL USING (
        public.has_role(auth.uid(), ''admin''::public.app_role) OR
        EXISTS (
          SELECT 1 FROM public.products p
          WHERE p.id = product_id AND p.tenant_id = public.get_user_tenant_id(auth.uid())
        )
      )';

    EXECUTE 'CREATE POLICY "Tenant users can view their portions" ON public.product_portions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.products p
          WHERE p.id = product_id AND p.tenant_id = public.get_user_tenant_id(auth.uid())
        )
      )';
  END IF;
END $$;

-- Orders policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    EXECUTE 'CREATE POLICY "Admins can manage all orders" ON public.orders
      FOR ALL USING (public.has_role(auth.uid(), ''admin''::public.app_role))';

    EXECUTE 'CREATE POLICY "Tenant users can view their orders" ON public.orders
      FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()))';

    EXECUTE 'CREATE POLICY "Tenant users can create their orders" ON public.orders
      FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()))';
  END IF;
END $$;

-- Order items policies (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_items') THEN
    EXECUTE 'CREATE POLICY "Admins can manage all order items" ON public.order_items
      FOR ALL USING (public.has_role(auth.uid(), ''admin''::public.app_role))';

    EXECUTE 'CREATE POLICY "Tenant users can view their order items" ON public.order_items
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.id = order_id AND o.tenant_id = public.get_user_tenant_id(auth.uid())
        )
      )';

    EXECUTE 'CREATE POLICY "Tenant users can create their order items" ON public.order_items
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.orders o
          WHERE o.id = order_id AND o.tenant_id = public.get_user_tenant_id(auth.uid())
        )
      )';
  END IF;
END $$;

-- Profiles policies
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR id = auth.uid()
  );

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR id = auth.uid()
  );

CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR id = auth.uid()
  );

-- Step 10: Create or replace the trigger function for new users
CREATE OR REPLACE FUNCTION public.assign_default_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign 'user' role by default for new signups
  -- No tenant_id for regular users (they access the frontend)
  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (NEW.id, 'user'::public.app_role, NULL)
  ON CONFLICT (user_id, tenant_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Step 11: Create trigger to auto-assign role on user creation
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_user_role();

-- Step 12: Migrate any existing users without roles
INSERT INTO public.user_roles (user_id, role, tenant_id)
SELECT
  au.id,
  'user'::public.app_role,
  NULL
FROM auth.users au
LEFT JOIN public.user_roles ur ON au.id = ur.user_id AND ur.tenant_id IS NULL
WHERE ur.id IS NULL
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- ============================================================================
-- Verification
-- ============================================================================
SELECT 'Migration completed successfully!' as status;

-- To verify the migration worked, run:
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'public.app_role'::regtype ORDER BY enumsortorder;
-- SELECT * FROM public.user_roles;
-- SELECT public.has_role(auth.uid(), 'admin'::public.app_role) as am_i_admin;
