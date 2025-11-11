# Admin Dashboard - Complete Feature List

## ✅ What You Can Do Now

### Tenant Management

**Create Tenants**
- Add new coffee shops to the platform
- Set name, slug, and description
- Activate/deactivate tenants

**View Tenants**
- See all tenants in the system
- View tenant details (name, slug, status, creation date)
- See active/inactive status

### User Management

**Create Users** ⭐
- Add new users with email/password
- Assign role: Admin, Tenant (Shop Owner), or User (Staff)
- Assign to specific tenant (for tenant/user roles)

**Edit Users** ⭐ NEW!
- Click "Edit" button next to any user
- Change user role (promote/demote)
- Reassign to different tenant
- Move users between coffee shops

**View Users**
- See all users across all tenants
- View user details (name, email, role, tenant)
- Color-coded role badges:
  - 🟣 Purple = Admin
  - 🔵 Blue = Tenant
  - 🟢 Green = User

### Dashboard Features

**Statistics Cards**
- Total Tenants count
- Total Users count

**Tabbed Interface**
- Tenants tab: Manage all coffee shops
- Users tab: Manage all users

## 🎯 Use Cases

### 1. Onboard a New Coffee Shop
```
1. Create tenant → "Downtown Coffee"
2. Create user (tenant role) → "shop-owner@coffee.com"
3. Shop owner can now log in and manage their shop
```

### 2. Hire New Staff
```
1. Go to Users tab
2. Create user (user role)
3. Assign to "Downtown Coffee" tenant
4. Staff can now use POS for that shop
```

### 3. Promote Staff to Manager
```
1. Find staff member in Users tab
2. Click "Edit"
3. Change role from "user" to "tenant"
4. Keep same tenant assignment
5. They now have full management access
```

### 4. Transfer Staff Between Shops
```
1. Find staff member in Users tab
2. Click "Edit"
3. Change tenant from "Downtown Coffee" to "Uptown Coffee"
4. Staff now works at the new location
```

### 5. Make Someone Platform Admin
```
1. Find user in Users tab
2. Click "Edit"
3. Change role to "admin"
4. Tenant field auto-clears (admins manage all)
5. They can now access Admin Dashboard
```

## 📋 Quick Reference

### Role Permissions

| Feature | Admin | Tenant | User |
|---------|-------|--------|------|
| Admin Dashboard (`/admin`) | ✅ | ❌ | ❌ |
| View All Tenants | ✅ | ❌ | ❌ |
| Create/Edit Tenants | ✅ | ❌ | ❌ |
| View All Users | ✅ | ❌ | ❌ |
| Create/Edit Users | ✅ | ❌ | ❌ |
| Tenant Dashboard (`/tenant`) | ✅ | ✅ | ❌ |
| POS System (`/pos`) | ✅* | ✅ | ✅** |
| Manage Own Tenant | ✅ | ✅ | ❌ |

\* Admins must select a tenant first
\** Users can only access if assigned to a tenant

### Role Hierarchy

```
Platform Level:
  └─ Admin (manages everything)

Tenant Level:
  ├─ Tenant (manages one coffee shop)
  └─ User (works at one coffee shop)
```

## 🚀 Getting Started

### First-Time Setup

1. **Assign yourself admin role**
   ```sql
   -- In Supabase SQL Editor
   INSERT INTO public.user_roles (user_id, role, tenant_id)
   VALUES ('your-user-id', 'admin'::public.app_role, NULL)
   ON CONFLICT (user_id, tenant_id)
   DO UPDATE SET role = 'admin'::public.app_role;
   ```

2. **Log out and log back in**
   - This refreshes your role

3. **Navigate to `/admin`**
   - You should see the Admin Dashboard

4. **Create your first tenant**
   - Click "Tenants" tab
   - Click "Add Tenant"
   - Fill in details

5. **Create a tenant manager**
   - Click "Users" tab
   - Click "Add User"
   - Set role to "tenant"
   - Assign to your tenant

6. **Test the system**
   - Log in as the tenant user
   - Access `/tenant` dashboard
   - Access `/pos` system

## 🔧 Technical Details

### Database Schema

```sql
-- Tenants Table
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ
);

-- User Roles Table
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  tenant_id UUID REFERENCES tenants(id),
  role app_role NOT NULL, -- 'admin' | 'tenant' | 'user'
  created_at TIMESTAMPTZ,
  UNIQUE(user_id, tenant_id)
);
```

### Key Functions

**Create User**
- Location: [AdminDashboard.tsx:173-240](src/pages/AdminDashboard.tsx#L173-L240)
- Creates auth user via Supabase Auth
- Inserts role into `user_roles` table

**Edit User**
- Location: [AdminDashboard.tsx:242-293](src/pages/AdminDashboard.tsx#L242-L293)
- Updates existing `user_roles` record
- Changes role and/or tenant assignment

**Fetch Admin Data**
- Location: [AdminDashboard.tsx:68-130](src/pages/AdminDashboard.tsx#L68-L130)
- Fetches all tenants
- Fetches all user_roles with joined profiles and tenant names

## 📚 Related Documentation

- [ADMIN_ACCESS_GUIDE.md](./ADMIN_ACCESS_GUIDE.md) - How to become an admin
- [USER_TENANT_MANAGEMENT.md](./USER_TENANT_MANAGEMENT.md) - Detailed user management guide
- [FIX_DATABASE_ERRORS.md](./FIX_DATABASE_ERRORS.md) - Database troubleshooting
- [assign-admin-role.sql](./assign-admin-role.sql) - SQL script to assign admin role

## 🎨 UI Components

The Admin Dashboard uses:
- **Tabs**: Switch between Tenants and Users
- **Cards**: Display statistics and lists
- **Dialogs**: Create/Edit forms
- **Buttons**: Actions (Add, Edit)
- **Select**: Dropdowns for role and tenant selection
- **Badges**: Color-coded role indicators

## 🔐 Security

All admin operations are protected by:
1. **Authentication**: Must be logged in
2. **Role Check**: Must have admin role
3. **RLS Policies**: Database-level access control
4. **Protected Routes**: UI-level route guards

## 💡 Tips

1. **Create tenants first** before creating tenant/user roles
2. **Use descriptive slugs** for tenants (e.g., "downtown-coffee")
3. **Set strong passwords** when creating users
4. **Test with different roles** to verify permissions
5. **Keep track of who has admin access** (security)

## ❓ FAQ

**Q: Can a user have multiple roles?**
A: The database supports it (different roles for different tenants), but the current UI manages one primary role.

**Q: How do I delete a user?**
A: Not implemented yet. You can manually delete from `user_roles` table in Supabase.

**Q: Can I change a user's email?**
A: Not from the UI. Email is tied to auth account. Use Supabase admin API.

**Q: What happens if I remove a tenant?**
A: Users assigned to that tenant will lose access. Consider reassigning first.

**Q: Can regular users see the Admin Dashboard?**
A: No. It's protected by `ProtectedRoute` requiring admin role.

## 🐛 Known Limitations

1. Cannot delete users from UI (must use Supabase dashboard)
2. Cannot change user email from UI
3. Cannot manage multiple roles per user from UI
4. No tenant editing functionality yet
5. No bulk user operations

## 🎯 Future Enhancements

Potential features to add:
- [ ] Delete user functionality
- [ ] Edit tenant details
- [ ] Deactivate/activate tenants
- [ ] Bulk user import (CSV)
- [ ] User activity logs
- [ ] Tenant statistics
- [ ] Password reset from admin
- [ ] User search/filter

---

**You're all set!** The Admin Dashboard now has full user and tenant management capabilities. 🎉
