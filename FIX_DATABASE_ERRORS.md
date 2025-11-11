# Database Error Fix - User Roles and Signup Issues

## Problem Summary

You're experiencing two main issues:

1. **User signup failing** with error: `relation "user_roles" does not exist`
2. **Admin dashboard not showing tenants** that were created in the database

## Root Cause

The database has conflicting migrations:
- One migration uses `app_role` enum ('admin', 'tenant')
- Another migration uses `user_role` enum ('admin', 'tenant', 'user')
- The `user_roles` table may not exist or has incorrect structure
- The `has_role` function has incorrect signature causing conflicts

## Solution

### Step 1: Run Diagnostic Script

1. Go to your Supabase Dashboard → SQL Editor
2. Open the file [check-and-apply-fix.sql](./check-and-apply-fix.sql)
3. Copy and paste the entire content into the SQL Editor
4. Run the script to see the current state of your database

This will show you:
- Which enum types exist
- If user_roles table exists
- Current table structure
- Existing policies
- Function signatures
- User counts and roles

### Step 2: Apply the Comprehensive Fix

1. Open the file [supabase/migrations/20251109_fix_user_roles_comprehensive.sql](./supabase/migrations/20251109_fix_user_roles_comprehensive.sql)
2. Copy the entire content
3. Go to Supabase Dashboard → SQL Editor
4. Paste and run the migration

**What this migration does:**
- Drops all conflicting policies
- Drops conflicting `has_role` functions
- Ensures `app_role` enum has all values: 'admin', 'tenant', 'user'
- Creates/ensures `user_roles` table with correct structure
- Recreates `has_role` function with correct signature
- Recreates all RLS policies with proper type casting
- Adds trigger to auto-assign 'user' role to new signups
- Migrates existing users to have default 'user' role

### Step 3: Verify the Fix

After running the migration, execute these queries:

```sql
-- Check enum values
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'public.app_role'::regtype
ORDER BY enumsortorder;

-- Should return: admin, tenant, user

-- Check if has_role function works
SELECT public.has_role(auth.uid(), 'admin'::public.app_role) as am_i_admin;

-- Check user_roles table
SELECT * FROM public.user_roles;

-- Check tenants (as admin)
SELECT * FROM public.tenants;
```

### Step 4: Test User Signup

1. Try signing up a new user through your application
2. The signup should work without errors
3. The new user should automatically get 'user' role assigned

### Step 5: Verify Admin Dashboard

1. Login with an admin user
2. Go to the Admin Dashboard
3. You should now see all tenants in the database

## Files Changed

- [supabase/migrations/20251109_fix_user_roles_comprehensive.sql](./supabase/migrations/20251109_fix_user_roles_comprehensive.sql) - Comprehensive fix migration
- [check-and-apply-fix.sql](./check-and-apply-fix.sql) - Diagnostic script

## Admin Dashboard Fix

The admin dashboard code at [src/pages/AdminDashboard.tsx](./src/pages/AdminDashboard.tsx) should work correctly after the migration is applied. It:

- Fetches all tenants (lines 71-74)
- Displays tenant count (line 262)
- Shows tenant details (lines 350-374)

If you still don't see tenants after applying the migration, make sure:
1. You're logged in as a user with 'admin' role
2. Run this query to assign admin role to your user:

```sql
-- Replace 'your-user-id' with your actual user ID
INSERT INTO public.user_roles (user_id, role, tenant_id)
VALUES ('your-user-id', 'admin'::public.app_role, NULL)
ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = 'admin'::public.app_role;
```

## Preventing Future Conflicts

To prevent this issue in the future:

1. **Use only one enum type**: Stick with `public.app_role`
2. **Consistent function signatures**: Always use `has_role(_user_id UUID, _role public.app_role)`
3. **Test migrations**: Always test migrations in a development environment first
4. **Version control**: Keep all migrations in version control and apply them in order

## Need Help?

If you encounter any issues:

1. Check the Supabase logs in Dashboard → Logs
2. Verify your user has admin role with the query above
3. Check that all migrations were applied successfully
4. Look for any other conflicting migrations

## Migration Order

If starting fresh, apply migrations in this order:

1. [20251108223810_ba49b46e-0e26-42bd-b65d-d532e916ccb7.sql](./supabase/migrations/20251108223810_ba49b46e-0e26-42bd-b65d-d532e916ccb7.sql) - Initial schema
2. [20251109_fix_user_roles_comprehensive.sql](./supabase/migrations/20251109_fix_user_roles_comprehensive.sql) - This fix

Do NOT apply [supabase-migration.sql](./supabase/migrations/supabase-migration.sql) as it conflicts with the app_role enum.
