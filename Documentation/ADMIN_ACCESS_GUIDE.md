# Admin Access Guide

## Current Issues and Solutions

You mentioned you cannot:
1. **Manage site users or tenants** in the Admin Dashboard
2. **Access tenant details**
3. **Access the front-end POS page as Admin**

## Root Cause

Based on the code analysis, here's what's happening:

### 1. Admin Dashboard Access
- The admin dashboard is accessible at `/admin`
- You need to have `role = 'admin'` in the `user_roles` table
- The `useAuth` hook fetches your role from `user_roles` table (lines 67-86 in [src/hooks/useAuth.tsx](src/hooks/useAuth.tsx:67-86))

### 2. POS Page Access
- The POS page at `/pos` requires `role = 'tenant'` (see [src/App.tsx:37-40](src/App.tsx:37-40))
- **However**, admins can access it too because of line 61 in [src/components/ProtectedRoute.tsx](src/components/ProtectedRoute.tsx:61): `userRole === "admin"`
- As an admin, you need to **select a tenant** first before accessing the POS (see [src/pages/POS.tsx:290-305](src/pages/POS.tsx:290-305))

### 3. Managing Users and Tenants
- The Admin Dashboard has full functionality to create/manage users and tenants
- You just need to ensure you have the `admin` role assigned

## How to Fix

### Step 1: Assign Yourself Admin Role

1. Go to **Supabase Dashboard → SQL Editor**
2. Open the file [assign-admin-role.sql](./assign-admin-role.sql)
3. Run **Step 1** to find your user ID
4. Copy your user ID
5. Run **Step 2** with your user ID to assign admin role
6. Run **Step 3** to verify

**Quick version** (replace with your actual user ID):
```sql
-- Find your user ID first
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- Then assign admin role (replace YOUR-USER-ID with actual ID)
INSERT INTO public.user_roles (user_id, role, tenant_id)
VALUES ('YOUR-USER-ID', 'admin'::public.app_role, NULL)
ON CONFLICT (user_id, tenant_id)
DO UPDATE SET role = 'admin'::public.app_role;
```

### Step 2: Refresh Your Browser

After assigning the admin role:
1. **Log out** from your application
2. **Log back in**
3. The `useAuth` hook will fetch your new admin role

### Step 3: Access Features

#### Admin Dashboard (`/admin`)
Once you're logged in as admin, you can:
- View all tenants
- Create new tenants
- View all users
- Create new users and assign them roles
- Assign users to tenants

#### POS Page (`/pos`)
As an admin:
1. Navigate to `/pos`
2. You'll see a **tenant selector** screen
3. Select a tenant from the dropdown
4. You'll then access that tenant's POS system

**Note**: The POS page requires a tenant to be selected because products are tenant-specific.

## Feature Breakdown

### What Admins Can Do

✅ Access `/admin` dashboard
✅ View all tenants
✅ Create/manage tenants
✅ View all users across all tenants
✅ Create users with any role (admin, tenant, user)
✅ Assign users to tenants
✅ Access `/pos` by selecting a tenant first
✅ Access any tenant's dashboard

### What Tenant Users Can Do

✅ Access `/tenant` dashboard (their own tenant only)
✅ Access `/pos` (their own tenant only)
✅ View their own products, orders, etc.
❌ Cannot access `/admin`
❌ Cannot see other tenants

### What Regular Users Can Do

✅ Access basic features (depending on your app)
❌ Cannot access `/admin`
❌ Cannot access `/tenant` or `/pos` (unless assigned tenant role)

## Troubleshooting

### Issue: "Cannot see tenants in Admin Dashboard"

**Cause**: Either not logged in as admin, or no tenants exist in database

**Solution**:
```sql
-- 1. Verify you're an admin
SELECT ur.role, au.email
FROM user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE au.id = auth.uid();

-- 2. Check if tenants exist
SELECT * FROM tenants;

-- 3. Create a test tenant if none exist
INSERT INTO tenants (name, slug, active)
VALUES ('Test Coffee Shop', 'test-shop', true);
```

### Issue: "Cannot access POS page"

**Cause**: Admins need to select a tenant first

**Solution**:
1. Navigate to `/pos`
2. You'll see a tenant selector
3. Select a tenant from the dropdown
4. The page will reload with that tenant's products

Alternatively, add this to your navigation to set the tenant context before accessing POS.

### Issue: "User creation from Admin Dashboard fails"

**Cause**: The migration created a trigger that auto-assigns 'user' role, which conflicts with the admin's manual role assignment

**Solution**: The admin dashboard code already handles this by inserting into `user_roles` after user creation (see [src/pages/AdminDashboard.tsx:207-211](src/pages/AdminDashboard.tsx:207-211))

If it fails, check:
```sql
-- Check if trigger is conflicting
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created_assign_role';

-- The trigger should allow ON CONFLICT DO NOTHING
```

## Database Schema Reference

### `user_roles` Table Structure
```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES tenants(id),
  role public.app_role NOT NULL,  -- 'admin' | 'tenant' | 'user'
  created_at TIMESTAMPTZ,
  UNIQUE(user_id, tenant_id)
);
```

### Role Hierarchy
- **admin**: Can access everything, manage all tenants and users
- **tenant**: Can access their own tenant's dashboard and POS
- **user**: Basic access (can be staff at a tenant)

### Important Notes

1. **Admin role has `tenant_id = NULL`** because they're not tied to a specific tenant
2. **Tenant/User roles have a specific `tenant_id`** tying them to their shop
3. **The UNIQUE constraint** is on `(user_id, tenant_id)`, meaning a user can have multiple roles for different tenants
4. **Admins bypass all role checks** due to line 61 in [ProtectedRoute.tsx](src/components/ProtectedRoute.tsx:61)

## Next Steps

1. Run [assign-admin-role.sql](./assign-admin-role.sql) to assign yourself admin role
2. Log out and log back in
3. Navigate to `/admin` to manage tenants and users
4. Navigate to `/pos` and select a tenant to access POS
5. Create test users and tenants to verify everything works

## Need More Help?

If you still have issues:
1. Check browser console for errors
2. Check Supabase logs in Dashboard → Logs
3. Verify RLS policies with: `SELECT * FROM pg_policies WHERE schemaname = 'public';`
4. Ensure the clean reset migration was applied successfully
