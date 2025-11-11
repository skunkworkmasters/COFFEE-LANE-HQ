-- Diagnostic Queries for CoffeeLane Admin Issues
-- Run these queries in Supabase SQL Editor to diagnose issues

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
-- 2. Check all tenants in database
-- ============================================================================
SELECT id, name, slug, active, created_at
FROM public.tenants
ORDER BY created_at DESC;

-- This bypasses RLS to see all tenants in the database

-- ============================================================================
-- 3. Check your admin user's role
-- ============================================================================
SELECT ur.role, ur.tenant_id, p.email, p.full_name
FROM public.user_roles ur
JOIN public.profiles p ON p.id = ur.user_id
WHERE p.email = 'YOUR_ADMIN_EMAIL_HERE';  -- Replace with your email

-- Expected: role = 'admin', tenant_id = null

-- ============================================================================
-- 4. Check RLS policies on tenants table
-- ============================================================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'tenants';

-- Should show "Admins can manage all tenants" policy

-- ============================================================================
-- 5. Check RLS policies on user_roles table
-- ============================================================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_roles';

-- Should show "Admins can manage all roles" policy

-- ============================================================================
-- 6. Test has_role function
-- ============================================================================
-- Replace 'YOUR_USER_ID_HERE' with your actual user UUID
SELECT public.has_role('YOUR_USER_ID_HERE'::uuid, 'admin'::public.app_role);

-- Expected: true (if you're admin)

-- ============================================================================
-- 7. Check all user_roles
-- ============================================================================
SELECT ur.id, ur.user_id, ur.role, ur.tenant_id, p.email
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.id = ur.user_id
ORDER BY ur.created_at DESC;

-- Shows all user role assignments

-- ============================================================================
-- 8. Test tenant SELECT as admin (run this as your admin user)
-- ============================================================================
-- This tests if RLS is allowing the select
-- Run this query while logged in as admin in Supabase
SELECT * FROM public.tenants;

-- If this returns no rows but query #2 shows tenants exist, RLS is blocking you
