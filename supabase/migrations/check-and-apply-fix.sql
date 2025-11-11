-- ============================================================================
-- Database Diagnostic and Fix Application Script
-- ============================================================================
-- Run this script in your Supabase SQL Editor to diagnose and fix the issues
-- ============================================================================

-- 1. Check current enum types
SELECT 'Checking enum types...' as step;

SELECT
  t.typname as enum_name,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('app_role', 'user_role')
GROUP BY t.typname;

-- 2. Check if user_roles table exists
SELECT 'Checking if user_roles table exists...' as step;

SELECT EXISTS (
  SELECT 1 FROM pg_tables
  WHERE schemaname = 'public' AND tablename = 'user_roles'
) as user_roles_exists;

-- 3. If table exists, check its structure
SELECT 'Checking user_roles table structure...' as step;

SELECT
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_roles'
ORDER BY ordinal_position;

-- 4. Check existing policies on user_roles (if table exists)
SELECT 'Checking RLS policies on user_roles...' as step;

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_roles';

-- 5. Check existing has_role function signatures
SELECT 'Checking has_role function signatures...' as step;

SELECT
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'has_role';

-- 6. Check current user count and roles
SELECT 'Checking current users and their roles...' as step;

SELECT COUNT(*) as total_auth_users FROM auth.users;

SELECT
  role,
  COUNT(*) as count
FROM public.user_roles
GROUP BY role;

-- 7. Check for users without roles
SELECT 'Checking for users without roles...' as step;

SELECT
  COUNT(*) as users_without_roles
FROM auth.users au
LEFT JOIN public.user_roles ur ON au.id = ur.user_id
WHERE ur.id IS NULL;

-- ============================================================================
-- Now apply the fix from the migration file:
-- Copy and paste the contents of:
-- supabase/migrations/20251109_fix_user_roles_comprehensive.sql
-- ============================================================================
