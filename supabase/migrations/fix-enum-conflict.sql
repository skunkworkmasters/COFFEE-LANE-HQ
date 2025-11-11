-- Fix enum type conflict between app_role and user_role
-- The database has TWO enum types which is causing conflicts

-- ============================================================================
-- Strategy: Standardize on app_role enum and fix has_role function
-- ============================================================================

-- 1. First, let's see what we have
-- Run this to check: SELECT enumlabel FROM pg_enum WHERE enumtypid = 'public.app_role'::regtype;
-- Run this to check: SELECT enumlabel FROM pg_enum WHERE enumtypid = 'public.user_role'::regtype;

-- 2. Fix the has_role function to use the correct enum type
-- The user_roles table uses app_role, so the function should too

DROP FUNCTION IF EXISTS public.has_role(UUID, public.user_role);
DROP FUNCTION IF EXISTS public.has_role(UUID, public.app_role);

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

-- 3. Ensure 'user' value exists in app_role enum
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

-- 4. Recreate RLS policies with correct function
DROP POLICY IF EXISTS "Admins can manage all tenants" ON public.tenants;
CREATE POLICY "Admins can manage all tenants" ON public.tenants
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Tenant users can view their tenant" ON public.tenants;
CREATE POLICY "Tenant users can view their tenant" ON public.tenants
  FOR SELECT USING (id = public.get_user_tenant_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

-- 5. Update profiles policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

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
SELECT 'Migration completed successfully' as status;

-- Test queries to run after migration:
-- SELECT public.has_role(auth.uid(), 'admin'::public.app_role);
-- SELECT * FROM public.tenants;
-- SELECT * FROM public.user_roles;
