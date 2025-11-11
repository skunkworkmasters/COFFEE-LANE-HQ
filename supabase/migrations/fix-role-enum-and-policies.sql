-- Fix role enum and RLS policies
-- This migration addresses multiple issues:
-- 1. Add 'user' role to app_role enum (currently only has 'admin' and 'tenant')
-- 2. Fix has_role function to match how it's called in RLS policies
-- 3. Ensure admin can view tenants and user_roles properly

-- ============================================================================
-- 1. Add 'user' to app_role enum if it doesn't exist
-- ============================================================================

DO $$
BEGIN
  -- Check if 'user' value exists in app_role enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.app_role'::regtype
    AND enumlabel = 'user'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'user';
  END IF;
END $$;

-- ============================================================================
-- 2. Fix has_role function to match RLS policy calls
-- ============================================================================

-- The RLS policies call has_role(auth.uid(), 'admin')
-- So the function signature should be (_user_id, _role) not (_role, _user_id)

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ============================================================================
-- 3. Verify admin can SELECT from tenants
-- ============================================================================

-- The existing policy "Admins can manage all tenants" should cover SELECT
-- but let's ensure it's working by checking if it exists

DO $$
BEGIN
  -- Check if the policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'tenants'
    AND policyname = 'Admins can manage all tenants'
  ) THEN
    -- Create it if it doesn't exist
    CREATE POLICY "Admins can manage all tenants" ON public.tenants
      FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- ============================================================================
-- 4. Verify admin can SELECT/INSERT/UPDATE user_roles
-- ============================================================================

DO $$
BEGIN
  -- Check if the policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'user_roles'
    AND policyname = 'Admins can manage all roles'
  ) THEN
    -- Create it if it doesn't exist
    CREATE POLICY "Admins can manage all roles" ON public.user_roles
      FOR ALL USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- ============================================================================
-- 5. Ensure profiles can be read by admins
-- ============================================================================

-- Drop and recreate profiles policies to ensure admins can read all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin') OR id = auth.uid()
  );

CREATE POLICY "Admins can insert profiles" ON public.profiles
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR id = auth.uid()
  );

CREATE POLICY "Admins can update profiles" ON public.profiles
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'admin') OR id = auth.uid()
  );

-- ============================================================================
-- Verification queries (run these to test)
-- ============================================================================

-- After running this migration, verify with these queries as admin:
-- SELECT * FROM public.tenants; -- Should show all tenants
-- SELECT * FROM public.user_roles; -- Should show all user roles
-- SELECT * FROM public.profiles; -- Should show all profiles

COMMENT ON FUNCTION public.has_role(UUID, public.app_role) IS
  'Check if a user has a specific role. Parameters: (user_id, role)';
