# User Registration & Approval Flow

## Overview

CoffeeLane HQ implements a secure user registration flow where new users must be reviewed and approved by administrators before gaining access to the system. This ensures only authorized personnel can access tenant operations.

## User Roles

The system supports three distinct roles:

### 1. Admin (Super Administrator)
- **Access**: Full system access to all tenants
- **Capabilities**:
  - Manage all tenants (create, edit, view)
  - Manage all users and assign roles
  - Manage product pool (centralized product catalog)
  - View all orders and statistics across tenants
- **Redirect**: `/admin` (Admin Dashboard)

### 2. Tenant (Shop Owner/Manager)
- **Access**: Full access to their assigned tenant
- **Capabilities**:
  - View and manage their tenant's dashboard
  - Select products from product pool and set custom pricing
  - Manage products and inventory for their shop
  - Access POS system
  - View orders and statistics for their shop
- **Redirect**: `/tenant` (Tenant Dashboard)

### 3. User (Staff Member)
- **Access**: Limited to POS operations for their assigned tenant
- **Capabilities**:
  - Access POS system only
  - Create orders
  - Process transactions
  - View available products
- **Redirect**: `/pos` (Point of Sale)

## Registration Flow

### Step 1: User Registration
1. New user visits `/auth` and clicks "Sign up"
2. User fills in registration form:
   - Full Name
   - Email
   - Password (minimum 6 characters)
3. Upon successful registration:
   - User account is created in `auth.users`
   - Profile is automatically created in `profiles` table
   - **NO role is assigned yet**
   - User is redirected to `/pending-approval`

### Step 2: Pending Approval Page
After registration, users see the **Pending Approval** page which displays:
- ✓ Account created confirmation
- ⏱️ Status: Under review by administrator
- 📧 Registered email address
- ℹ️ Information about what happens next
- 🔄 "Check Status" button to refresh
- 🚪 "Sign Out" button

**Key Features:**
- Auto-redirects to appropriate dashboard if role is assigned
- Prevents access to protected routes
- Professional, reassuring UI
- Clear communication about the process

### Step 3: Administrator Assignment
Administrators access the **Admin Dashboard** → **User Management** tab to:

1. **View Pending Users**
   - See all registered users without assigned roles
   - View user email and registration details

2. **Assign User to Tenant**
   - Select the tenant (coffee shop location)
   - Choose the appropriate role:
     - **Tenant** for shop owners/managers
     - **User** for staff members

3. **Create Entry in `user_roles` Table**
   - Inserts record with:
     - `user_id`: User's UUID
     - `tenant_id`: Assigned tenant UUID (null for admins)
     - `role`: Selected role (admin/tenant/user)

### Step 4: User Access Granted
Once administrator assigns a role:

1. **User Logs In Again** (or clicks "Check Status")
2. **Authentication Flow**:
   - `useAuth` hook fetches user's role from `user_roles` table
   - Role is stored in auth context
3. **Auto-Redirect Based on Role**:
   - **Admin** → `/admin` (Admin Dashboard)
   - **Tenant** → `/tenant` (Tenant Dashboard)
   - **User** → `/pos` (Point of Sale)

## Technical Implementation

### Database Migration

**File**: `supabase/migrations/20251109_add_user_role.sql`

Adds "user" role to the `app_role` enum:

```sql
ALTER TYPE public.app_role ADD VALUE 'user';
```

**Run this migration in Supabase SQL Editor before using the new flow!**

### Key Files Modified

1. **PendingApproval.tsx** (New)
   - Pending approval page component
   - Auto-redirects when role is assigned
   - Refresh and sign out functionality

2. **Auth.tsx**
   - Updated registration flow
   - Redirects to `/pending-approval` after signup

3. **Index.tsx**
   - Checks if authenticated user has role
   - Redirects to pending approval if no role
   - Redirects to appropriate dashboard based on role

4. **App.tsx**
   - Added `/pending-approval` route
   - Updated POS route to allow both "user" and "tenant" roles

5. **ProtectedRoute.tsx**
   - Updated redirect logic for "user" role → `/pos`

6. **AdminDashboard.tsx**
   - Already includes "User (Staff)" option in role selection
   - Create and Edit User dialogs support all three roles

### Authentication Context

**useAuth Hook** (`src/hooks/useAuth.tsx`):
- Fetches user role from `user_roles` table
- Returns `userRole` as `null` if no role assigned
- Used throughout app to determine access and redirects

### Row Level Security (RLS)

Existing RLS policies handle all three roles:

```sql
-- Admin access to everything
public.has_role(auth.uid(), 'admin'::public.app_role)

-- Tenant users access their tenant data
tenant_id = public.get_user_tenant_id(auth.uid())
```

The "user" role works the same as "tenant" for RLS - both are tenant-scoped.

## User Experience Flow Diagram

```
┌─────────────────┐
│   Register      │
│  /auth (signup) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Pending Approval│
│  /pending-      │
│   approval      │
└────────┬────────┘
         │
         │ Admin assigns role
         │
         ▼
┌─────────────────┐
│   Login Again   │
│  /auth (login)  │
└────────┬────────┘
         │
         ├─────────────┬──────────────┐
         │             │              │
         ▼             ▼              ▼
    ┌────────┐   ┌─────────┐   ┌─────────┐
    │ Admin  │   │ Tenant  │   │  User   │
    │Dashboard│  │Dashboard│   │   POS   │
    │ /admin │   │ /tenant │   │  /pos   │
    └────────┘   └─────────┘   └─────────┘
```

## Administrator Workflow

### Assigning New Users

1. **Navigate to Admin Dashboard** → User Management tab
2. **View Pending Users** (users with email but no role badge)
3. **Click "Edit"** on the user
4. **Select Role**:
   - **Admin**: For super administrators (no tenant needed)
   - **Tenant**: For shop owners/managers (select tenant)
   - **User**: For staff members (select tenant)
5. **Select Tenant** (required for Tenant and User roles)
6. **Click "Update User"**

### Creating Users Directly (Alternative)

Admins can also create users directly:

1. **Click "Create User"**
2. **Fill in**:
   - Email
   - Password (temporary)
   - Full Name
   - Role
   - Tenant (if not admin)
3. **User receives credentials** and can log in immediately

## Security Considerations

### Why This Flow?

1. **Prevents Unauthorized Access**
   - Users cannot self-assign to any tenant
   - Administrator approval required

2. **Tenant Isolation**
   - Each user is assigned to specific tenant
   - RLS policies enforce data separation

3. **Role-Based Access Control**
   - Clear separation of capabilities
   - Staff cannot access admin functions

### Best Practices

1. **Review Registrations Promptly**
   - Check pending users regularly
   - Verify user identity before assignment

2. **Use Strong Passwords**
   - Enforce 6+ character minimum
   - Encourage complex passwords

3. **Audit User Assignments**
   - Review user roles periodically
   - Remove inactive users

## Testing the Flow

### Test Scenario 1: New Staff Member

1. User registers at `/auth`
2. Sees pending approval page
3. Admin assigns to "Coffee Shop A" as "User" (Staff)
4. User logs in again
5. Auto-redirected to `/pos`
6. Can create orders but not access dashboards

### Test Scenario 2: New Tenant Admin

1. User registers at `/auth`
2. Sees pending approval page
3. Admin assigns to "Coffee Shop B" as "Tenant"
4. User logs in again
5. Auto-redirected to `/tenant`
6. Can manage products, view orders, access POS

### Test Scenario 3: User Without Assignment

1. User registers at `/auth`
2. Sees pending approval page
3. User tries to navigate to `/pos` or `/tenant`
4. Redirected back to `/pending-approval`
5. Must wait for admin assignment

## Troubleshooting

### Issue: User Stuck on Pending Approval

**Cause**: No role assigned in `user_roles` table

**Solution**:
```sql
-- Check if user has role
SELECT * FROM user_roles WHERE user_id = '[user-uuid]';

-- If empty, admin needs to assign role via dashboard
```

### Issue: User Can't Access POS

**Cause**: User has no role or wrong role

**Solution**:
1. Admin edits user in dashboard
2. Assigns "User" or "Tenant" role
3. Selects correct tenant
4. User logs out and back in

### Issue: Migration Not Applied

**Cause**: `app_role` enum doesn't include 'user'

**Solution**:
```sql
-- Run in Supabase SQL Editor
-- Copy contents from: supabase/migrations/20251109_add_user_role.sql
```

## Summary

The user registration flow ensures:
- ✅ Secure, administrator-controlled user onboarding
- ✅ Clear role-based access control
- ✅ Professional user experience
- ✅ Automatic redirects based on assigned role
- ✅ Tenant isolation and data security

Users register → Wait for approval → Admin assigns role → User gains access to appropriate interface
