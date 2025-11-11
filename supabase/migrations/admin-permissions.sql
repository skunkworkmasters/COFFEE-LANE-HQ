-- Admin Permissions Migration
-- This migration ensures admins can create tenants and manage users

-- ============================================================================
-- 1. Enable admin to insert into tenants table
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can insert tenants" ON tenants;

-- Create policy allowing admins to insert new tenants
CREATE POLICY "Admins can insert tenants"
ON tenants
FOR INSERT
TO authenticated
WITH CHECK (
  has_role('admin', auth.uid())
);

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can update tenants" ON tenants;

-- Create policy allowing admins to update tenants
CREATE POLICY "Admins can update tenants"
ON tenants
FOR UPDATE
TO authenticated
USING (has_role('admin', auth.uid()))
WITH CHECK (has_role('admin', auth.uid()));

-- ============================================================================
-- 2. Enable admin to insert into user_roles table
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can insert user roles" ON user_roles;

-- Create policy allowing admins to insert user roles
CREATE POLICY "Admins can insert user roles"
ON user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role('admin', auth.uid())
);

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can update user roles" ON user_roles;

-- Create policy allowing admins to update user roles
CREATE POLICY "Admins can update user roles"
ON user_roles
FOR UPDATE
TO authenticated
USING (has_role('admin', auth.uid()))
WITH CHECK (has_role('admin', auth.uid()));

-- ============================================================================
-- 3. Enable admin to insert into profiles table
-- ============================================================================

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;

-- Create policy allowing admins to insert profiles (for new user creation)
CREATE POLICY "Admins can insert profiles"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role('admin', auth.uid())
);

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;

-- Create policy allowing admins to update profiles
CREATE POLICY "Admins can update profiles"
ON profiles
FOR UPDATE
TO authenticated
USING (has_role('admin', auth.uid()))
WITH CHECK (has_role('admin', auth.uid()));

-- ============================================================================
-- 4. Admin can read all data (already exists but ensure it's there)
-- ============================================================================

-- Ensure admins can select from tenants
DROP POLICY IF EXISTS "Admins can view all tenants" ON tenants;
CREATE POLICY "Admins can view all tenants"
ON tenants
FOR SELECT
TO authenticated
USING (has_role('admin', auth.uid()));

-- Ensure admins can select from user_roles
DROP POLICY IF EXISTS "Admins can view all user roles" ON user_roles;
CREATE POLICY "Admins can view all user roles"
ON user_roles
FOR SELECT
TO authenticated
USING (has_role('admin', auth.uid()));

-- Ensure admins can select from profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles"
ON profiles
FOR SELECT
TO authenticated
USING (has_role('admin', auth.uid()));

-- ============================================================================
-- 5. Grant necessary permissions on auth schema (if needed)
-- ============================================================================

-- Note: Direct auth.users manipulation is not allowed from client side
-- User creation must go through Supabase Auth API (supabase.auth.signUp)
-- which we're already using in the handleCreateUser function

-- ============================================================================
-- Verify the migration
-- ============================================================================

-- You can verify by running these queries as admin:
-- SELECT * FROM tenants; -- Should show all tenants
-- SELECT * FROM user_roles; -- Should show all user roles
-- SELECT * FROM profiles; -- Should show all profiles

COMMENT ON POLICY "Admins can insert tenants" ON tenants IS
  'Allows admin users to create new tenant records';

COMMENT ON POLICY "Admins can insert user roles" ON user_roles IS
  'Allows admin users to assign roles to users';

COMMENT ON POLICY "Admins can insert profiles" ON profiles IS
  'Allows admin users to create user profiles when creating new users';
