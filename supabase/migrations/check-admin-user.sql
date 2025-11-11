-- Check if admin user exists and is properly configured
-- Run this in Supabase SQL Editor

-- Replace 'your-admin-email@example.com' with your actual admin email
-- This query runs at database level, not through auth context

-- ============================================================================
-- 1. Find your user in profiles
-- ============================================================================
SELECT
  'Profile Check' as check_type,
  p.id as user_id,
  p.email,
  p.full_name
FROM public.profiles p
WHERE p.email = 'your-admin-email@example.com';  -- REPLACE THIS

-- ============================================================================
-- 2. Check if that user has admin role
-- ============================================================================
SELECT
  'Role Check' as check_type,
  ur.user_id,
  ur.role,
  ur.tenant_id,
  p.email
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE p.email = 'your-admin-email@example.com';  -- REPLACE THIS

-- Expected: role = 'admin', tenant_id = null

-- ============================================================================
-- 3. Check all users and their roles
-- ============================================================================
SELECT
  p.email,
  ur.role,
  ur.tenant_id,
  CASE WHEN ur.role = 'admin' THEN 'YES' ELSE 'NO' END as is_admin
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
ORDER BY ur.created_at DESC;

-- Look for your email and verify role = 'admin'
