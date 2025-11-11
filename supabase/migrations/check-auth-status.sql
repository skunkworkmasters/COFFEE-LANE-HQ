-- ============================================================================
-- Authentication Status Check Script
-- ============================================================================
-- Run this in Supabase SQL Editor to diagnose authentication issues
-- ============================================================================

-- 1. List all users in the system
SELECT
  '=== ALL USERS ===' as section,
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at,
  CASE
    WHEN email_confirmed_at IS NOT NULL THEN 'Confirmed'
    ELSE 'NOT CONFIRMED - User cannot login!'
  END as email_status
FROM auth.users
ORDER BY created_at DESC;

-- 2. List all users with their roles
SELECT
  '=== USERS WITH ROLES ===' as section,
  au.email,
  ur.role,
  t.name as tenant_name,
  ur.created_at as role_assigned_at
FROM auth.users au
LEFT JOIN user_roles ur ON ur.user_id = au.id
LEFT JOIN tenants t ON t.id = ur.tenant_id
ORDER BY au.created_at DESC;

-- 3. Find users WITHOUT roles (should be empty after migration)
SELECT
  '=== USERS WITHOUT ROLES ===' as section,
  au.email,
  au.created_at,
  'NO ROLE ASSIGNED!' as status
FROM auth.users au
LEFT JOIN user_roles ur ON ur.user_id = au.id
WHERE ur.id IS NULL;

-- 4. Check if trigger exists
SELECT
  '=== TRIGGERS ===' as section,
  tgname as trigger_name,
  tgenabled as enabled,
  CASE tgenabled
    WHEN 'O' THEN 'Enabled'
    WHEN 'D' THEN 'DISABLED'
    ELSE 'Unknown'
  END as status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created_assign_role';

-- 5. Check enum values
SELECT
  '=== ROLE ENUM VALUES ===' as section,
  enumlabel as role_value,
  enumsortorder as sort_order
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- 6. Count roles by type
SELECT
  '=== ROLE DISTRIBUTION ===' as section,
  role,
  COUNT(*) as user_count
FROM user_roles
GROUP BY role
ORDER BY user_count DESC;

-- 7. Check recent activity
SELECT
  '=== RECENT ACTIVITY ===' as section,
  au.email,
  au.last_sign_in_at,
  au.created_at,
  CASE
    WHEN au.last_sign_in_at IS NULL THEN 'Never logged in'
    ELSE 'Last login: ' || au.last_sign_in_at::text
  END as login_status
FROM auth.users au
ORDER BY au.created_at DESC
LIMIT 10;

-- ============================================================================
-- INTERPRETATION GUIDE
-- ============================================================================

/*

WHAT TO LOOK FOR:

1. ALL USERS section:
   - If empty: No users exist - sign up first at /auth
   - Check email_status: If "NOT CONFIRMED", user cannot login
   - Check email_confirmed_at: Should have a timestamp (unless email confirmation is disabled)

2. USERS WITH ROLES section:
   - Every user should have a role
   - New signups should get 'user' role automatically
   - Admins should have 'admin' role and tenant_name = NULL

3. USERS WITHOUT ROLES section:
   - Should be EMPTY after running migration
   - If you see users here, the trigger didn't fire
   - Manually assign roles or re-run migration

4. TRIGGERS section:
   - Should show 'on_auth_user_created_assign_role' as Enabled
   - If missing or DISABLED, roles won't be assigned automatically

5. ROLE ENUM VALUES section:
   - Should show: admin, tenant, user
   - If 'user' is missing, re-run migration

6. ROLE DISTRIBUTION section:
   - Shows how many users have each role
   - Helps verify role assignments are working

7. RECENT ACTIVITY section:
   - Shows if users have successfully logged in
   - "Never logged in" might indicate confirmation issues

COMMON PROBLEMS:

❌ User has no role assigned:
   → Run: INSERT INTO user_roles (user_id, role, tenant_id) VALUES ('user-uuid', 'user', NULL);

❌ Email not confirmed:
   → Disable email confirmation in Supabase Dashboard (Auth → Providers → Email)
   → Or check email for confirmation link

❌ Trigger not found or disabled:
   → Re-run the migration script: supabase-migration.sql

❌ 'user' enum value missing:
   → Re-run the migration script: supabase-migration.sql

*/

-- ============================================================================
-- Quick Fixes
-- ============================================================================

-- To assign 'admin' role to a specific user (replace email):
/*
INSERT INTO user_roles (user_id, role, tenant_id)
SELECT id, 'admin'::user_role, NULL
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (user_id, tenant_id)
DO UPDATE SET role = 'admin';
*/

-- To assign 'user' role to all users without roles:
/*
INSERT INTO user_roles (user_id, role, tenant_id)
SELECT au.id, 'user'::user_role, NULL
FROM auth.users au
LEFT JOIN user_roles ur ON ur.user_id = au.id
WHERE ur.id IS NULL
ON CONFLICT (user_id, tenant_id) DO NOTHING;
*/
