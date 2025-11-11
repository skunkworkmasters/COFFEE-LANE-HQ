-- ============================================================================
-- CoffeeLane Multi-Persona Role System Migration
-- ============================================================================
-- This migration adds support for 3 user personas: admin, tenant, and user
-- It includes automatic role assignment and proper role-based routing
-- ============================================================================

-- Step 1: Update the user_role enum to include 'user' persona
DO $$
BEGIN
  -- Check if the enum type exists
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    -- Add 'user' to the enum if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      WHERE enumtypid = 'user_role'::regtype
      AND enumlabel = 'user'
    ) THEN
      ALTER TYPE user_role ADD VALUE 'user';
    END IF;
  ELSE
    -- Create the enum type if it doesn't exist
    CREATE TYPE user_role AS ENUM ('admin', 'tenant', 'user');
  END IF;
END $$;

-- Step 2: Ensure user_roles table exists with correct structure
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- Step 3: Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id ON user_roles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Step 4: Create or replace function to automatically assign default role
CREATE OR REPLACE FUNCTION assign_default_user_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Assign 'user' role by default for new signups
  -- No tenant_id for regular users (they access the frontend)
  INSERT INTO user_roles (user_id, role, tenant_id)
  VALUES (NEW.id, 'user', NULL)
  ON CONFLICT (user_id, tenant_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create trigger to auto-assign role on user creation
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION assign_default_user_role();

-- Step 6: Update has_role function to support all three roles
-- The existing function signature is (_role, _user_id) - we keep it for compatibility
CREATE OR REPLACE FUNCTION has_role(_role user_role, _user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Create function to get user's primary role
CREATE OR REPLACE FUNCTION get_user_primary_role(_user_id UUID)
RETURNS user_role AS $$
DECLARE
  _role user_role;
BEGIN
  -- Priority: admin > tenant > user
  SELECT role INTO _role
  FROM user_roles
  WHERE user_id = _user_id
  ORDER BY
    CASE role
      WHEN 'admin' THEN 1
      WHEN 'tenant' THEN 2
      WHEN 'user' THEN 3
    END
  LIMIT 1;

  RETURN _role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create function to check if user can access admin dashboard
CREATE OR REPLACE FUNCTION can_access_admin(_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN has_role('admin', _user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Create function to check if user can access tenant dashboard
CREATE OR REPLACE FUNCTION can_access_tenant(_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN has_role('tenant', _user_id) OR has_role('admin', _user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Update RLS policies for user_roles table
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;

-- Allow users to view their own roles
CREATE POLICY "Users can view their own roles"
  ON user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow admins to view all roles
CREATE POLICY "Admins can view all roles"
  ON user_roles
  FOR SELECT
  USING (has_role('admin', auth.uid()));

-- Allow admins to insert new roles
CREATE POLICY "Admins can insert roles"
  ON user_roles
  FOR INSERT
  WITH CHECK (has_role('admin', auth.uid()));

-- Allow admins to update roles
CREATE POLICY "Admins can update roles"
  ON user_roles
  FOR UPDATE
  USING (has_role('admin', auth.uid()))
  WITH CHECK (has_role('admin', auth.uid()));

-- Allow admins to delete roles
CREATE POLICY "Admins can delete roles"
  ON user_roles
  FOR DELETE
  USING (has_role('admin', auth.uid()));

-- Step 11: Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Add updated_at trigger to user_roles
DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- OPTIONAL: Migrate existing users without roles to 'user' role
-- ============================================================================
-- Uncomment the following block if you want to assign 'user' role to
-- existing users who don't have any role assigned yet

/*
INSERT INTO user_roles (user_id, role, tenant_id)
SELECT
  au.id,
  'user'::user_role,
  NULL
FROM auth.users au
LEFT JOIN user_roles ur ON au.id = ur.user_id
WHERE ur.id IS NULL
ON CONFLICT (user_id, tenant_id) DO NOTHING;
*/

-- ============================================================================
-- Verification Queries (Run these to verify the migration)
-- ============================================================================

-- Check enum values
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'user_role'::regtype ORDER BY enumsortorder;

-- Check existing roles distribution
-- SELECT role, COUNT(*) as count FROM user_roles GROUP BY role;

-- Check users without roles
-- SELECT COUNT(*) FROM auth.users au LEFT JOIN user_roles ur ON au.id = ur.user_id WHERE ur.id IS NULL;

-- ============================================================================
-- End of Migration
-- ============================================================================
