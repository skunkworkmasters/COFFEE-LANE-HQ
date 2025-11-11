# Quick Start: Role Management

## 1. Apply Database Migration

Copy and paste the entire content of [supabase-migration.sql](supabase-migration.sql) into your Supabase SQL Editor and execute it.

## 2. Make Yourself Admin

After running the migration, assign yourself the admin role:

```sql
-- Replace 'your-email@example.com' with your actual email
INSERT INTO user_roles (user_id, role, tenant_id)
SELECT
  au.id,
  'admin'::user_role,
  NULL
FROM auth.users au
WHERE au.email = 'your-email@example.com'
ON CONFLICT (user_id, tenant_id)
DO UPDATE SET role = 'admin';
```

## 3. Create a Test Tenant

```sql
-- Create a coffee shop tenant
INSERT INTO tenants (name, slug, active)
VALUES ('Test Coffee Shop', 'test-coffee', true)
RETURNING id;
```

## 4. Assign Someone as Tenant Manager

```sql
-- Replace the UUIDs with actual values
INSERT INTO user_roles (user_id, role, tenant_id)
VALUES (
  'user-uuid-here',        -- User's ID from auth.users
  'tenant'::user_role,
  'tenant-uuid-here'       -- Tenant ID from previous step
)
ON CONFLICT (user_id, tenant_id)
DO UPDATE SET role = 'tenant';
```

## 5. Useful Queries

### List all users with their roles
```sql
SELECT
  au.email,
  ur.role,
  t.name as tenant_name,
  au.created_at
FROM auth.users au
LEFT JOIN user_roles ur ON ur.user_id = au.id
LEFT JOIN tenants t ON t.id = ur.tenant_id
ORDER BY au.created_at DESC;
```

### Find a user's ID by email
```sql
SELECT id, email, created_at
FROM auth.users
WHERE email = 'user@example.com';
```

### Change a user's role
```sql
UPDATE user_roles
SET role = 'admin'  -- or 'tenant' or 'user'
WHERE user_id = 'user-uuid-here';
```

### Remove a user's role assignment
```sql
DELETE FROM user_roles
WHERE user_id = 'user-uuid-here'
AND tenant_id IS NULL;  -- for admin/user roles
-- Use: AND tenant_id = 'tenant-uuid' for tenant roles
```

## 6. Test the Setup

1. Sign out and sign up with a new account → Should get 'user' role automatically
2. Sign in as admin → Should redirect to `/admin`
3. Sign in as tenant → Should redirect to `/tenant`
4. Sign in as user → Should stay on `/` landing page

## Role Hierarchy

```
┌─────────────┐
│    ADMIN    │  ← Full access to everything
└─────────────┘
      │
      ├─→ /admin   (Admin Dashboard)
      ├─→ /tenant  (Can access tenant areas)
      └─→ /pos     (Can access POS)

┌─────────────┐
│   TENANT    │  ← Manages their coffee shop
└─────────────┘
      │
      ├─→ /tenant  (Tenant Dashboard)
      └─→ /pos     (Point of Sale)

┌─────────────┐
│    USER     │  ← Regular customer/visitor
└─────────────┘
      │
      └─→ /        (Landing Page - Frontend)
```

## Common Tasks

### Promote a user to admin
```sql
UPDATE user_roles SET role = 'admin' WHERE user_id = 'uuid-here';
```

### Create tenant and assign manager in one go
```sql
-- Step 1: Create tenant
WITH new_tenant AS (
  INSERT INTO tenants (name, slug, active)
  VALUES ('My Coffee Shop', 'my-coffee-shop', true)
  RETURNING id
)
-- Step 2: Assign user as tenant manager
INSERT INTO user_roles (user_id, role, tenant_id)
SELECT
  'user-uuid-here',
  'tenant'::user_role,
  new_tenant.id
FROM new_tenant;
```

### See all tenants and their managers
```sql
SELECT
  t.name as tenant_name,
  t.slug,
  t.active,
  au.email as manager_email,
  ur.role
FROM tenants t
LEFT JOIN user_roles ur ON ur.tenant_id = t.id AND ur.role = 'tenant'
LEFT JOIN auth.users au ON au.id = ur.user_id
ORDER BY t.created_at DESC;
```

## Troubleshooting

**New users not getting 'user' role?**
```sql
-- Check if trigger exists
SELECT tgname FROM pg_trigger WHERE tgname = 'on_auth_user_created_assign_role';

-- If missing, run the migration script again
```

**User has no role assigned?**
```sql
-- Manually assign 'user' role
INSERT INTO user_roles (user_id, role, tenant_id)
VALUES ('user-uuid', 'user', NULL);
```

**Access denied errors?**
```sql
-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_roles';
```
