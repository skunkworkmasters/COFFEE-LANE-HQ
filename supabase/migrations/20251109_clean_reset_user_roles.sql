-- ============================================================================
-- CLEAN RESET AND REBUILD - User Roles System
-- ============================================================================
-- This migration does a complete clean reset of all policies and functions
-- then rebuilds everything from scratch
-- Date: 2025-11-09
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL POLICIES (Complete Clean Slate)
-- ============================================================================

-- Drop ALL policies on tenants table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tenants')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.tenants CASCADE';
  END LOOP;
END $$;

-- Drop ALL policies on user_roles table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.user_roles CASCADE';
  END LOOP;
END $$;

-- Drop ALL policies on profiles table
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles')
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.profiles CASCADE';
  END LOOP;
END $$;

-- Drop ALL policies on products table (if exists)
DO $$
DECLARE
  r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'products') THEN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products')
    LOOP
      EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.products CASCADE';
    END LOOP;
  END IF;
END $$;

-- Drop ALL policies on product_portions table (if exists)
DO $$
DECLARE
  r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'product_portions') THEN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_portions')
    LOOP
      EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.product_portions CASCADE';
    END LOOP;
  END IF;
END $$;

-- Drop ALL policies on orders table (if exists)
DO $$
DECLARE
  r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'orders') THEN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders')
    LOOP
      EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.orders CASCADE';
    END LOOP;
  END IF;
END $$;

-- Drop ALL policies on order_items table (if exists)
DO $$
DECLARE
  r RECORD;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'order_items') THEN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_items')
    LOOP
      EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.order_items CASCADE';
    END LOOP;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: DROP ALL FUNCTIONS (Using CASCADE)
-- ============================================================================

DROP FUNCTION IF EXISTS public.has_role(UUID, public.user_role) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(public.app_role, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.has_role(public.user_role, UUID) CASCADE;
DROP FUNCTION IF EXISTS has_role(user_role, UUID) CASCADE;
DROP FUNCTION IF EXISTS has_role(app_role, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_tenant_id(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.assign_default_user_role() CASCADE;

-- Drop any triggers that might be using these functions
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;

-- ============================================================================
-- STEP 3: ENSURE ENUM TYPE IS CORRECT
-- ============================================================================

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

-- ============================================================================
-- STEP 4: ENSURE USER_ROLES TABLE EXISTS WITH CORRECT STRUCTURE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON public.user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: REBUILD ALL FUNCTIONS
-- ============================================================================

-- Function: has_role
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

-- Function: get_user_tenant_id
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

-- Function: assign_default_user_role (for trigger)
CREATE OR REPLACE FUNCTION public.assign_default_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign 'user' role by default for new signups
  INSERT INTO public.user_roles (user_id, role, tenant_id)
  VALUES (NEW.id, 'user'::public.app_role, NULL)
  ON CONFLICT (user_id, tenant_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- STEP 6: REBUILD ALL RLS POLICIES
-- ============================================================================

-- TENANTS POLICIES
CREATE POLICY "Admins can manage all tenants"
  ON public.tenants
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Tenant users can view their tenant"
  ON public.tenants
  FOR SELECT
  USING (id = public.get_user_tenant_id(auth.uid()));

-- USER_ROLES POLICIES
CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (user_id = auth.uid());

-- PROFILES POLICIES
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR id = auth.uid()
  );

CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid());

-- PRODUCTS POLICIES (if table exists)
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

-- PRODUCT_PORTIONS POLICIES (if table exists)
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

-- ORDERS POLICIES (if table exists)
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

-- ORDER_ITEMS POLICIES (if table exists)
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

-- ============================================================================
-- STEP 7: RECREATE TRIGGER FOR AUTO-ASSIGNING ROLES
-- ============================================================================

CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_user_role();

-- ============================================================================
-- STEP 8: MIGRATE EXISTING USERS WITHOUT ROLES
-- ============================================================================

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
-- VERIFICATION
-- ============================================================================

SELECT 'Clean reset completed successfully!' as status;

-- Run these queries to verify:
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'public.app_role'::regtype ORDER BY enumsortorder;
-- SELECT * FROM public.user_roles;
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;
