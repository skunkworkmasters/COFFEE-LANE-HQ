# Admin Tenant and User Management

## Overview

The Super Admin can create new tenants (coffee shops) and assign users to those tenants with specific roles. This document explains how to manage tenants and users from the Admin Dashboard.

## Table of Contents

1. [Tenant Management](#tenant-management)
2. [User Management](#user-management)
3. [User Roles Explained](#user-roles-explained)
4. [Database Permissions](#database-permissions)
5. [Troubleshooting](#troubleshooting)

---

## Tenant Management

### What is a Tenant?

A tenant represents a **coffee shop** in the CoffeeLane multi-tenant platform. Each tenant has:
- Unique products and inventory
- Their own staff members
- Separate POS system
- Individual analytics and reports
- Isolated data from other tenants

### Creating a New Tenant

**Steps:**

1. **Login as Admin**
2. **Navigate to Admin Dashboard** (`/admin`)
3. **Click on "Tenants" tab**
4. **Click "Add Tenant" button**
5. **Fill in the form:**
   - **Tenant Name**: Full name of the coffee shop (e.g., "Downtown Coffee House")
   - **Slug**: URL-friendly identifier (e.g., "downtown-coffee-house")
     - Auto-converts to lowercase with hyphens
     - Must be unique across all tenants
   - **Description** (Optional): Brief description of the tenant
6. **Click "Create Tenant"**

**Field Requirements:**

| Field | Required | Format | Example |
|-------|----------|--------|---------|
| Name | Yes | Any text | "Downtown Coffee House" |
| Slug | Yes | Lowercase, hyphens only | "downtown-coffee-house" |
| Description | No | Any text | "Premium coffee in downtown area" |

**What Happens:**

- New tenant record created with `active: true`
- Tenant appears in the tenant list
- Tenant becomes available for user assignment
- Tenant appears in admin's tenant selector dropdown

### Viewing Tenants

All tenants are displayed in the "Tenants" tab with:
- **Tenant Name**
- **Slug**
- **Created Date**
- **Status** (Active/Inactive badge)

---

## User Management

### Creating a New User

**Steps:**

1. **Login as Admin**
2. **Navigate to Admin Dashboard** (`/admin`)
3. **Click on "Users" tab**
4. **Click "Add User" button**
5. **Fill in the form:**
   - **Full Name**: User's complete name
   - **Email**: User's email address (used for login)
   - **Password**: Initial password (user should change on first login)
   - **Role**: Select from Admin, Tenant, or User
   - **Tenant**: Select which coffee shop (only for Tenant and User roles)
6. **Click "Create User"**

**Field Requirements:**

| Field | Required | Rules |
|-------|----------|-------|
| Full Name | Yes | Any text |
| Email | Yes | Valid email format, must be unique |
| Password | Yes | Minimum 6 characters (Supabase default) |
| Role | Yes | One of: admin, tenant, user |
| Tenant | Conditional | Required for tenant and user roles, N/A for admin |

**What Happens:**

1. User account created in Supabase Auth
2. Profile created in `profiles` table
3. Role assigned in `user_roles` table
4. User can immediately login with provided credentials
5. User redirected to appropriate dashboard based on role

### Viewing Users

All users are displayed in the "Users" tab with:
- **Full Name / Email**
- **Email Address**
- **Associated Tenant**
- **Role Badge** (color-coded)

---

## User Roles Explained

### 1. Admin (Super Admin)

**Access Level:** Full system access

**Capabilities:**
- Create and manage tenants
- Create and manage all users
- View any tenant's POS system
- View any tenant's dashboard
- Access admin dashboard
- Switch between tenants using tenant selector

**Tenant Assignment:** None (admin has access to all tenants)

**Landing Page:** Admin Dashboard (`/admin`)

**Use Case:** Platform administrators who manage the entire CoffeeLane system

---

### 2. Tenant (Shop Owner)

**Access Level:** Full access to assigned tenant only

**Capabilities:**
- View their tenant's dashboard
- Access their tenant's POS system
- Manage products (prices, images, descriptions)
- View sales analytics
- Manage inventory
- Cannot create users or access other tenants

**Tenant Assignment:** Must be assigned to exactly one tenant

**Landing Page:** Tenant Dashboard (`/tenant`)

**Use Case:** Coffee shop owners who manage their business remotely

---

### 3. User (Staff)

**Access Level:** Limited access to assigned tenant's POS

**Capabilities:**
- Access their tenant's POS system
- Create orders
- Generate invoices
- Cannot access dashboards
- Cannot manage products or view analytics

**Tenant Assignment:** Must be assigned to exactly one tenant

**Landing Page:** Frontend (`/`) - then redirected to POS if configured

**Use Case:** Coffee shop staff members who operate the POS on tablets

---

## Database Permissions

### RLS Policies

The following Row Level Security policies enable admin tenant and user management:

#### Tenants Table

```sql
-- Admins can view all tenants
"Admins can view all tenants" - SELECT
"Admins can insert tenants" - INSERT
"Admins can update tenants" - UPDATE
```

#### User Roles Table

```sql
-- Admins can manage all user roles
"Admins can view all user roles" - SELECT
"Admins can insert user roles" - INSERT
"Admins can update user roles" - UPDATE
```

#### Profiles Table

```sql
-- Admins can manage all profiles
"Admins can view all profiles" - SELECT
"Admins can insert profiles" - INSERT
"Admins can update profiles" - UPDATE
```

### Migration Script

Apply the admin permissions migration:

```bash
# Run the migration on Supabase
psql $DATABASE_URL -f supabase/migrations/admin-permissions.sql
```

Or through Supabase Dashboard:
1. Go to SQL Editor
2. Paste contents of `admin-permissions.sql`
3. Run query

---

## Troubleshooting

### Error: "Tenant is required for non-admin users"

**Cause:** Trying to create a Tenant or User role without selecting a tenant

**Solution:** Select a tenant from the dropdown before creating the user

---

### Error: "User already exists"

**Cause:** Email address already registered in the system

**Solution:** Use a different email address or modify the existing user's role

---

### Error: "Failed to create user"

**Possible Causes:**
1. Password too short (minimum 6 characters)
2. Invalid email format
3. Network connectivity issue
4. Supabase Auth service unavailable

**Solution:**
- Verify password meets minimum requirements
- Check email format
- Try again after a few moments

---

### Error: "Permission denied for table tenants/user_roles"

**Cause:** Admin RLS policies not applied

**Solution:** Run the `admin-permissions.sql` migration script

---

### Users not appearing in list

**Cause:** RLS policies preventing data fetch

**Solution:**
1. Verify you're logged in as admin
2. Check admin role assignment in `user_roles` table
3. Verify RLS policies are enabled and correct

---

## Best Practices

### Tenant Creation

1. **Use descriptive names** - "Downtown Coffee House" not "Shop1"
2. **Keep slugs simple** - "downtown-coffee" not "downtown-coffee-house-premium-beans"
3. **Create tenants before users** - Users need tenants to be assigned to
4. **Use consistent naming** - Follow the same pattern for all tenants

### User Creation

1. **Unique emails** - Each user must have a unique email address
2. **Strong passwords** - Use secure initial passwords
3. **Assign correct role**:
   - **Admin**: Only for platform administrators
   - **Tenant**: For coffee shop owners who need full business access
   - **User**: For staff who only need POS access
4. **Verify tenant assignment** - Double-check tenant before creating user

### Security

1. **Limit admin accounts** - Only create admin accounts for trusted platform administrators
2. **Regular audits** - Periodically review user list for inactive accounts
3. **Password policy** - Instruct users to change their password on first login
4. **Tenant isolation** - Verify users only have access to their assigned tenant

---

## Example Workflows

### Workflow 1: Onboarding a New Coffee Shop

1. **Create Tenant**
   - Name: "Sunrise Coffee"
   - Slug: "sunrise-coffee"
   - Description: "Coffee shop on Main Street"

2. **Create Shop Owner**
   - Full Name: "Jane Smith"
   - Email: "jane@sunrisecoffee.com"
   - Role: Tenant
   - Tenant: "Sunrise Coffee"

3. **Create Staff Members**
   - Full Name: "John Doe"
   - Email: "john.staff@sunrisecoffee.com"
   - Role: User
   - Tenant: "Sunrise Coffee"

4. **Notify Users**
   - Send credentials to shop owner and staff
   - Instruct them to change passwords on first login

---

### Workflow 2: Adding Staff to Existing Tenant

1. **Navigate to Users tab**
2. **Click "Add User"**
3. **Fill in staff details**
   - Select "User" role
   - Select existing tenant
4. **Create user**
5. **Provide credentials to staff member**

---

## API Reference (for developers)

### Create Tenant

```typescript
const { error } = await supabase.from("tenants").insert({
  name: "Coffee Shop Name",
  slug: "coffee-shop-slug",
  description: "Optional description",
  active: true,
});
```

### Create User

```typescript
// 1. Create auth user
const { data: authData, error: authError } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "securepassword",
  options: {
    data: {
      full_name: "User Full Name",
    },
  },
});

// 2. Create user role
const { error: roleError } = await supabase.from("user_roles").insert({
  user_id: authData.user.id,
  role: "tenant", // or "user" or "admin"
  tenant_id: "tenant-uuid", // null for admin
});
```

---

## Files Modified

- `src/pages/AdminDashboard.tsx` - Tenant and user management UI
- `supabase/migrations/admin-permissions.sql` - RLS policies for admin operations
- Database tables: `tenants`, `user_roles`, `profiles`

---

## Support

For issues related to tenant and user management:

1. Verify admin permissions are applied
2. Check Supabase logs for detailed error messages
3. Review RLS policies in Supabase dashboard
4. Check network tab in browser for API errors
