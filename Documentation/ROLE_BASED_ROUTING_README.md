# Role-Based Routing Implementation Guide

This document explains the role-based routing system for CoffeeLane, which supports three user personas: **Admin**, **Tenant**, and **User**.

## Overview

The application now automatically redirects users to their appropriate dashboard based on their assigned role:

- **Admin** → `/admin` - Full access to admin dashboard, can manage tenants and users
- **Tenant** → `/tenant` - Access to tenant dashboard and POS system for their coffee shop
- **User** → `/` - Regular users stay on the frontend landing page

## Database Setup

### 1. Run the SQL Migration

Execute the SQL migration script in your Supabase SQL Editor:

```bash
# Copy the contents of supabase-migration.sql and run it in Supabase SQL Editor
# Or if you have Supabase CLI installed:
supabase db reset
# Then paste the migration content
```

The migration script ([supabase-migration.sql](supabase-migration.sql)) will:

1. ✅ Update the `user_role` enum to include 'admin', 'tenant', and 'user'
2. ✅ Ensure the `user_roles` table exists with proper structure
3. ✅ Create indexes for performance
4. ✅ Add trigger to automatically assign 'user' role to new signups
5. ✅ Create helper functions for role checking
6. ✅ Set up Row Level Security (RLS) policies

### 2. Verify the Migration

Run these queries in Supabase SQL Editor to verify:

```sql
-- Check enum values (should show: admin, tenant, user)
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'user_role'::regtype
ORDER BY enumsortorder;

-- Check existing roles distribution
SELECT role, COUNT(*) as count
FROM user_roles
GROUP BY role;

-- Check users without roles
SELECT COUNT(*)
FROM auth.users au
LEFT JOIN user_roles ur ON au.id = ur.user_id
WHERE ur.id IS NULL;
```

### 3. Optional: Migrate Existing Users

If you have existing users without roles, uncomment this section in the migration script:

```sql
INSERT INTO user_roles (user_id, role, tenant_id)
SELECT
  au.id,
  'user'::user_role,
  NULL
FROM auth.users au
LEFT JOIN user_roles ur ON au.id = ur.user_id
WHERE ur.id IS NULL
ON CONFLICT (user_id, tenant_id) DO NOTHING;
```

## How It Works

### Automatic Role Assignment

When a new user registers:

1. User signs up via the Auth page
2. Supabase creates the user in `auth.users`
3. **Trigger automatically assigns 'user' role** (no tenant_id)
4. User is redirected to the landing page `/`

### Role-Based Routing

The routing system uses:

- **ProtectedRoute Component** ([src/components/ProtectedRoute.tsx](src/components/ProtectedRoute.tsx)) - Guards routes based on role
- **Updated App.tsx** ([src/App.tsx](src/App.tsx)) - Defines protected route structure
- **Updated Index Page** ([src/pages/Index.tsx](src/pages/Index.tsx)) - Redirects based on role
- **Updated useAuth Hook** ([src/hooks/useAuth.tsx](src/hooks/useAuth.tsx)) - Handles all three roles

### Route Structure

```
Public Routes:
  / (Index)          - Landing page (redirects admin/tenant, allows user)
  /auth              - Sign in / Sign up page

Protected Routes (Admin only):
  /admin             - Admin dashboard

Protected Routes (Tenant + Admin):
  /tenant            - Tenant dashboard
  /pos               - Point of Sale system

404:
  *                  - Not found page
```

### Admin Privileges

Admins have special access:
- Can access ALL routes (admin, tenant, pos)
- Can view and manage all tenants
- Can assign/modify user roles
- Can view all orders across all tenants

## User Management

### Assigning Roles Manually

To assign a role to a user via SQL:

```sql
-- Assign admin role
INSERT INTO user_roles (user_id, role, tenant_id)
VALUES ('user-uuid-here', 'admin', NULL)
ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = 'admin';

-- Assign tenant role (with tenant_id)
INSERT INTO user_roles (user_id, role, tenant_id)
VALUES ('user-uuid-here', 'tenant', 'tenant-uuid-here')
ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = 'tenant';

-- Assign user role
INSERT INTO user_roles (user_id, role, tenant_id)
VALUES ('user-uuid-here', 'user', NULL)
ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = 'user';
```

### Getting User IDs

To find a user's ID:

```sql
-- By email
SELECT id, email FROM auth.users WHERE email = 'user@example.com';

-- List all users with their roles
SELECT
  au.id,
  au.email,
  p.full_name,
  ur.role,
  t.name as tenant_name
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
LEFT JOIN user_roles ur ON ur.user_id = au.id
LEFT JOIN tenants t ON t.id = ur.tenant_id
ORDER BY au.created_at DESC;
```

## Database Functions

The migration creates these helper functions:

### `has_role(_user_id UUID, _role user_role) → BOOLEAN`
Check if a user has a specific role:

```sql
SELECT has_role('user-uuid', 'admin');
```

### `get_user_primary_role(_user_id UUID) → user_role`
Get user's primary role (priority: admin > tenant > user):

```sql
SELECT get_user_primary_role('user-uuid');
```

### `can_access_admin(_user_id UUID) → BOOLEAN`
Check if user can access admin dashboard:

```sql
SELECT can_access_admin(auth.uid());
```

### `can_access_tenant(_user_id UUID) → BOOLEAN`
Check if user can access tenant dashboard:

```sql
SELECT can_access_tenant(auth.uid());
```

## Security

### Row Level Security (RLS)

All tables have RLS enabled with policies:

- Users can view their own roles
- Admins can view/manage all roles
- Tenants can only access their tenant's data
- Regular users have limited access

### Type Safety

TypeScript types are updated to include all three roles:

```typescript
type UserRole = Database["public"]["Enums"]["app_role"];
// "admin" | "tenant" | "user"
```

## Testing the Implementation

### Test User Signup Flow

1. Go to `/auth`
2. Sign up with a new account
3. You should be redirected to `/` (landing page)
4. Check database - user should have 'user' role automatically

```sql
SELECT * FROM user_roles WHERE user_id = 'your-new-user-id';
```

### Test Role-Based Access

1. **As User**: Can access landing page, cannot access `/admin` or `/tenant`
2. **As Tenant**: Gets redirected to `/tenant`, can access `/pos`
3. **As Admin**: Gets redirected to `/admin`, can access everything

### Test Protected Routes

Try accessing protected routes:

```
/admin  → Should redirect to /auth if not logged in
        → Should redirect to /tenant if logged in as tenant
        → Should allow access if logged in as admin

/tenant → Should redirect to /auth if not logged in
        → Should redirect to / if logged in as user
        → Should allow access if logged in as tenant or admin
```

## Troubleshooting

### Users Not Getting Default Role

Check if the trigger is working:

```sql
-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created_assign_role';

-- Manually assign role if needed
INSERT INTO user_roles (user_id, role, tenant_id)
VALUES ('user-uuid', 'user', NULL);
```

### TypeScript Errors

If you see type errors, restart your TypeScript server:
- In VS Code: `Cmd/Ctrl + Shift + P` → "TypeScript: Restart TS Server"

### Infinite Redirect Loop

Clear browser cache and localStorage:

```javascript
// In browser console
localStorage.clear();
location.reload();
```

## File Changes Summary

Files created/modified:

- ✅ [supabase-migration.sql](supabase-migration.sql) - Database migration script
- ✅ [src/integrations/supabase/types.ts](src/integrations/supabase/types.ts:299) - Added 'user' to app_role enum
- ✅ [src/components/ProtectedRoute.tsx](src/components/ProtectedRoute.tsx) - New route guard component
- ✅ [src/App.tsx](src/App.tsx) - Updated with protected routes
- ✅ [src/pages/Index.tsx](src/pages/Index.tsx) - Updated redirect logic
- ✅ [src/hooks/useAuth.tsx](src/hooks/useAuth.tsx) - Updated to handle all roles

## Next Steps

1. **Run the migration** in Supabase SQL Editor
2. **Test user signup** to verify automatic role assignment
3. **Manually assign admin role** to your account
4. **Create tenants** via admin dashboard
5. **Assign tenant roles** to users who should manage coffee shops
6. **Build role management UI** in admin dashboard (future enhancement)

## Support

For issues or questions:
- Check the Supabase logs for database errors
- Verify RLS policies are working correctly
- Ensure environment variables in [.env](.env) are correct
