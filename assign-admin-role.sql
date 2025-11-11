-- ============================================================================
-- Assign Admin Role to Your User
-- ============================================================================
-- This script will help you become an admin and access all features
-- ============================================================================

-- Step 1: Find your user ID
-- Run this query first to find your user ID
SELECT
  id,
  email,
  created_at
FROM auth.users
ORDER BY created_at DESC;

-- Copy your user ID from the results above and use it in the next step

-- ============================================================================
-- Step 2: Assign admin role to your user
-- ============================================================================
-- Replace 'YOUR-USER-ID-HERE' with your actual user ID from Step 1

-- Example:
-- INSERT INTO public.user_roles (user_id, role, tenant_id)
-- VALUES ('31b761fd-6fb7-40d1-93f7-d5c2b023c78b', 'admin'::public.app_role, NULL)
-- ON CONFLICT (user_id, tenant_id)
-- DO UPDATE SET role = 'admin'::public.app_role;

-- Uncomment and modify the line below:
-- INSERT INTO public.user_roles (user_id, role, tenant_id)
-- VALUES ('YOUR-USER-ID-HERE', 'admin'::public.app_role, NULL)
-- ON CONFLICT (user_id, tenant_id)
-- DO UPDATE SET role = 'admin'::public.app_role;

-- ============================================================================
-- Step 3: Verify your admin role was assigned
-- ============================================================================

SELECT
  ur.id,
  ur.user_id,
  ur.role,
  ur.tenant_id,
  au.email,
  ur.created_at
FROM public.user_roles ur
JOIN auth.users au ON ur.user_id = au.id
ORDER BY ur.created_at DESC;

-- You should see your email with role = 'admin'

-- ============================================================================
-- Step 4: Check that you can access admin features
-- ============================================================================

-- Test the has_role function (replace with your user ID)
-- SELECT public.has_role('YOUR-USER-ID-HERE', 'admin'::public.app_role) as am_i_admin;

-- Check tenants table access
SELECT
  id,
  name,
  slug,
  active,
  created_at
FROM public.tenants
ORDER BY created_at DESC;

-- ============================================================================
-- BONUS: View all users and their roles
-- ============================================================================

SELECT
  au.email,
  ur.role,
  t.name as tenant_name,
  ur.created_at as role_assigned_at
FROM auth.users au
LEFT JOIN public.user_roles ur ON au.id = ur.user_id
LEFT JOIN public.tenants t ON ur.tenant_id = t.id
ORDER BY au.created_at DESC;
