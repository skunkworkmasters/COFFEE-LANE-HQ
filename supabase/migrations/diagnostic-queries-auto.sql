-- Diagnostic Queries for CoffeeLane Admin Issues (Auto version)
-- Run these queries in Supabase SQL Editor to diagnose issues
-- This version uses auth.uid() so you don't need to replace anything

-- ============================================================================
-- 1. Check if app_role enum has 'user' value
-- ============================================================================
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'public.app_role'::regtype
ORDER BY enumlabel;

-- Expected output: admin, tenant, user
-- If 'user' is missing, run fix-role-enum-and-policies.sql

-- ============================================================================
-- 2. Check all tenants in database (bypasses RLS)
-- ============================================================================
SELECT id, name, slug, active, created_at, description
FROM public.tenants
ORDER BY created_at DESC;

-- ============================================================================
-- 3. Check YOUR admin user's role (automatic)
-- ============================================================================
SELECT
  auth.uid() as my_user_id,
  ur.role,
  ur.tenant_id,
  p.email,
  p.full_name
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE ur.user_id = auth.uid();

-- Expected: role = 'admin', tenant_id = null

-- ============================================================================
-- 4. Test has_role function for YOUR user (automatic)
-- ============================================================================
SELECT
  auth.uid() as my_user_id,
  public.has_role(auth.uid(), 'admin'::public.app_role) as is_admin;

-- Expected: is_admin = true

-- ============================================================================
-- 5. Check RLS policies on tenants table
-- ============================================================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'tenants'
ORDER BY policyname;

-- Should show "Admins can manage all tenants" policy

-- ============================================================================
-- 6. Check RLS policies on user_roles table
-- ============================================================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- Should show "Admins can manage all roles" policy

-- ============================================================================
-- 7. Check all user_roles
-- ============================================================================
SELECT ur.id, ur.user_id, ur.role, ur.tenant_id, p.email, p.full_name
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
ORDER BY ur.created_at DESC;

-- Shows all user role assignments

-- ============================================================================
-- 8. Test tenant SELECT as YOUR admin user (automatic)
-- ============================================================================
-- This tests if RLS is allowing YOU to select
SELECT * FROM public.tenants;

-- If this returns no rows but query #2 shows tenants exist, RLS is blocking you

-- ============================================================================
-- SUMMARY: Quick Check
-- ============================================================================
SELECT
  'My User ID' as check_type,
  auth.uid()::text as value
UNION ALL
SELECT
  'My Role',
  ur.role::text
FROM public.user_roles ur
WHERE ur.user_id = auth.uid()
UNION ALL
SELECT
  'Is Admin?',
  public.has_role(auth.uid(), 'admin'::public.app_role)::text
UNION ALL
SELECT
  'Tenants I can see',
  COUNT(*)::text
FROM public.tenants;
