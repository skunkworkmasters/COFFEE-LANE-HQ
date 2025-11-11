-- Fix enum type conflict between app_role and user_role
-- The database has TWO enum types which is causing conflicts
-- This version drops all policies FIRST before dropping functions

-- ============================================================================
-- Strategy: Drop policies, drop function, recreate function, recreate policies
-- ============================================================================

-- 1. Drop all policies that depend on has_role function
DROP POLICY IF EXISTS "Admins can manage all tenants" ON public.tenants;
DROP POLICY IF EXISTS "Tenant users can view their tenant" ON public.tenants;

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;
DROP POLICY IF EXISTS "Tenant users can view their products" ON public.products;
DROP POLICY IF EXISTS "Tenant users can manage their products" ON public.products;

DROP POLICY IF EXISTS "Admins can manage all portions" ON public.product_portions;
DROP POLICY IF EXISTS "Tenant users can view their portions" ON public.product_portions;

DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;
DROP POLICY IF EXISTS "Tenant users can view their orders" ON public.orders;
DROP POLICY IF EXISTS "Tenant users can create their orders" ON public.orders;

DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;
DROP POLICY IF EXISTS "Tenant users can view their order items" ON public.order_items;
DROP POLICY IF EXISTS "Tenant users can create their order items" ON public.order_items;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

-- 2. Now we can drop the functions
DROP FUNCTION IF EXISTS public.has_role(UUID, public.user_role);
DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role);

-- 3. Create the corrected has_role function
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

-- 4. Ensure 'user' value exists in app_role enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.app_role'::regtype
    AND enumlabel = 'user'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'user';
  END IF;
END $$;

-- 5. Recreate all RLS policies with correct type casting

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

-- Products policies
CREATE POLICY "Admins can manage all products" ON public.products
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Tenant users can view their products" ON public.products
  FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant users can manage their products" ON public.products
  FOR ALL USING (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Product portions policies
CREATE POLICY "Admins can manage all portions" ON public.product_portions
  FOR ALL USING (
    public.has_role(auth.uid(), 'admin'::public.app_role) OR
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND p.tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );

CREATE POLICY "Tenant users can view their portions" ON public.product_portions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND p.tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );

-- Orders policies
CREATE POLICY "Admins can manage all orders" ON public.orders
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Tenant users can view their orders" ON public.orders
  FOR SELECT USING (tenant_id = public.get_user_tenant_id(auth.uid()));

CREATE POLICY "Tenant users can create their orders" ON public.orders
  FOR INSERT WITH CHECK (tenant_id = public.get_user_tenant_id(auth.uid()));

-- Order items policies
CREATE POLICY "Admins can manage all order items" ON public.order_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Tenant users can view their order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );

CREATE POLICY "Tenant users can create their order items" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.tenant_id = public.get_user_tenant_id(auth.uid())
    )
  );

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

-- 6. Verify the changes
SELECT 'Migration completed successfully!' as status;

-- Test with these queries after migration:
-- SELECT public.has_role(auth.uid(), 'admin'::public.app_role) as am_i_admin;
-- SELECT * FROM public.tenants;
-- SELECT * FROM public.user_roles;
