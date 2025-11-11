# User and Tenant Management Guide

## Overview

The Admin Dashboard now has **full user and tenant management** capabilities. As an admin, you can:

✅ **Create new tenants** (coffee shops)
✅ **Create new users** with any role
✅ **Edit existing user roles** and tenant assignments
✅ **Associate users with any tenant**
✅ **View all users and tenants** across the platform

## Features Added

### 1. Edit User Roles and Tenant Assignments

You can now click the **"Edit" button** next to any user in the Admin Dashboard to:

- **Change their role** (admin, tenant, user)
- **Assign them to a different tenant**
- **Remove tenant assignment** (by changing role to admin)
- **Promote users to tenant admins** (change role from "user" to "tenant")

### 2. User Roles Explained

#### Admin (Super Admin)
- Has access to everything
- Can manage all tenants
- Can create/edit users
- No tenant assignment (can access all tenants)
- Access: `/admin` dashboard and `/pos` (with tenant selection)

#### Tenant (Shop Owner/Manager)
- Manages their assigned coffee shop
- Can access their tenant's POS system
- Can view their products, orders, etc.
- Must be assigned to a specific tenant
- Access: `/tenant` dashboard and `/pos`

#### User (Staff)
- Basic access level
- Can be assigned to work at a specific tenant
- Typically used for POS staff
- Must be assigned to a specific tenant
- Access: Limited based on your app's needs

## How to Use

### Create a New Tenant

1. Go to **Admin Dashboard** (`/admin`)
2. Click the **"Tenants" tab**
3. Click **"Add Tenant" button**
4. Fill in:
   - **Name**: Coffee shop name (e.g., "Downtown Coffee")
   - **Slug**: URL-friendly identifier (e.g., "downtown-coffee")
   - **Description**: Optional description
5. Click **"Create Tenant"**

### Create a New User

1. Go to **Admin Dashboard** (`/admin`)
2. Click the **"Users" tab**
3. Click **"Add User" button**
4. Fill in:
   - **Full Name**: User's full name
   - **Email**: User's email (used for login)
   - **Password**: Initial password
   - **Role**: Select admin, tenant, or user
   - **Tenant**: Select which coffee shop (only if role is tenant or user)
5. Click **"Create User"**

### Edit Existing User's Role or Tenant

1. Go to **Admin Dashboard** (`/admin`)
2. Click the **"Users" tab**
3. Find the user you want to edit
4. Click the **"Edit" button** next to their name
5. In the dialog:
   - **User & Email**: Read-only (shows who you're editing)
   - **Role**: Change their role
   - **Tenant**: Assign to a different tenant (if not admin)
6. Click **"Update User"**

## Common Scenarios

### Scenario 1: Assign a Staff Member to a Coffee Shop

1. **Create the tenant** (coffee shop) if it doesn't exist
2. **Create the user** with role "user" and select their tenant
3. They can now access the POS system for that specific tenant

### Scenario 2: Promote a Staff Member to Shop Manager

1. Find the user in the **Users tab**
2. Click **"Edit"**
3. Change their role from "user" to "tenant"
4. Keep the same tenant assignment
5. Click **"Update User"**
6. They now have full access to manage that tenant's dashboard

### Scenario 3: Move a User to a Different Shop

1. Find the user in the **Users tab**
2. Click **"Edit"**
3. Keep their role the same
4. Change the **Tenant** dropdown to the new shop
5. Click **"Update User"**

### Scenario 4: Make Someone a Platform Admin

1. Find the user in the **Users tab**
2. Click **"Edit"**
3. Change their role to "admin"
4. The tenant field will disappear (admins aren't tied to tenants)
5. Click **"Update User"**
6. They now have full platform access

### Scenario 5: Demote an Admin to Tenant Manager

1. Find the admin user in the **Users tab**
2. Click **"Edit"**
3. Change their role to "tenant"
4. Select which tenant they should manage
5. Click **"Update User"**

## Visual Indicators

The user list now shows:
- **Purple badge**: Admin users
- **Blue badge**: Tenant users (shop managers)
- **Green badge**: Regular users (staff)
- **Edit button**: Click to modify user's role and tenant

## Database Changes

When you edit a user, the system updates the `user_roles` table:

```sql
UPDATE user_roles
SET
  role = 'selected_role',
  tenant_id = 'selected_tenant_id' (or NULL for admins)
WHERE id = 'user_role_id';
```

## Important Notes

### 1. Admin Role
- Admins have `tenant_id = NULL` in the database
- They can access any tenant by selecting it
- Changing an admin to tenant/user requires selecting a tenant

### 2. Tenant Assignment
- Tenant and User roles **must** have a tenant assigned
- The UI enforces this validation
- Admins **cannot** have a tenant assignment

### 3. Multiple Roles per User
- The database supports users having different roles for different tenants
- However, the current UI manages one primary role per user
- To give a user multiple roles, you'd need to manually insert into `user_roles` table

### 4. User Email Cannot Be Changed
- User email is tied to their auth account
- To change email, you'd need to use Supabase admin functions
- The edit dialog shows email as read-only

## Troubleshooting

### Issue: "Tenant is required for non-admin users"

**Cause**: You're trying to assign a user/tenant role without selecting a tenant

**Solution**: Select a tenant from the dropdown before saving

### Issue: Can't see the Edit button

**Cause**: You're not logged in as an admin

**Solution**: Ensure you have admin role assigned (see [ADMIN_ACCESS_GUIDE.md](./ADMIN_ACCESS_GUIDE.md))

### Issue: User can't access tenant dashboard after role change

**Cause**: User hasn't logged out and back in

**Solution**:
1. User should log out
2. Log back in
3. The `useAuth` hook will fetch their new role

### Issue: Changes not showing in the list

**Cause**: UI hasn't refreshed

**Solution**: The list auto-refreshes after save. If not, refresh the page.

## API Reference

The Admin Dashboard uses these Supabase functions:

### Create User
```javascript
// 1. Create auth user
supabase.auth.signUp({
  email, password,
  options: { data: { full_name } }
})

// 2. Insert role
supabase.from("user_roles").insert({
  user_id, role, tenant_id
})
```

### Update User Role
```javascript
supabase.from("user_roles")
  .update({ role, tenant_id })
  .eq("id", user_role_id)
```

### Fetch Users with Details
```javascript
// Fetch user_roles
supabase.from("user_roles").select("*")

// For each role, fetch profile and tenant
supabase.from("profiles")
  .select("full_name, email")
  .eq("id", user_id)

supabase.from("tenants")
  .select("name")
  .eq("id", tenant_id)
```

## Security

All operations are protected by:
- **RLS policies**: Only admins can modify user_roles
- **Authentication**: Must be logged in
- **Role checks**: `useAuth` hook verifies admin role
- **ProtectedRoute**: Blocks non-admins from accessing admin dashboard

See [src/pages/AdminDashboard.tsx](src/pages/AdminDashboard.tsx) for implementation details.

## Next Steps

After setting up users and tenants:

1. **Test login** with different user roles
2. **Verify tenant access** for tenant users
3. **Test POS system** with tenant/user roles
4. **Create products** for each tenant
5. **Train staff** on using the POS system

## File References

- Admin Dashboard: [src/pages/AdminDashboard.tsx](src/pages/AdminDashboard.tsx)
- Protected Routes: [src/components/ProtectedRoute.tsx](src/components/ProtectedRoute.tsx)
- Auth Hook: [src/hooks/useAuth.tsx](src/hooks/useAuth.tsx)
- Database Migration: [supabase/migrations/20251109_clean_reset_user_roles.sql](supabase/migrations/20251109_clean_reset_user_roles.sql)
