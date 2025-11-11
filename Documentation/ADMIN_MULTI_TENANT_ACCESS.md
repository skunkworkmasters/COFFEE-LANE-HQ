# Admin Multi-Tenant Access

## Overview

The Super Admin can view and manage **every POS and Tenant Dashboard** for all tenants registered on the CoffeeLane platform. This feature enables centralized monitoring and support across all coffee shops.

## How It Works

### Tenant Context System

A global tenant context (`useTenantContext`) manages which tenant the admin is currently viewing. This context is accessible throughout the application via:

```tsx
const { selectedTenantId, setSelectedTenantId, isAdminViewingTenant } = useTenantContext();
```

### Tenant Selector Component

The `TenantSelector` component appears in the navigation menu for admin users. It provides:

- Dropdown list of all registered tenants
- Search/filter capability
- Visual indication of currently selected tenant
- Quick switching between tenant views

**Location**: Navigation bar (visible only to admin role)

## Admin Access Flow

### 1. POS System Access

When an admin navigates to `/pos`:

1. **Tenant Selection Required**: If no tenant is selected, a prompt appears asking the admin to select a tenant from the navigation menu
2. **Data Isolation**: Once a tenant is selected, all POS data (products, orders, cart) is filtered to that specific tenant
3. **Visual Indicator**: An "Admin View" badge appears to remind the admin they're viewing another tenant's data
4. **Order Creation**: Orders created by admin are attributed to the selected tenant's account

**File**: `src/pages/POS.tsx`

### 2. Tenant Dashboard Access

When an admin navigates to `/tenant`:

1. **Tenant Selection Required**: Similar to POS, tenant selection is required before viewing the dashboard
2. **Dashboard Data**: All statistics, orders, and analytics are filtered by `selectedTenantId`
3. **Visual Indicator**: An "Admin View" badge appears in the dashboard header
4. **Real-time Updates**: Data refreshes when switching between different tenants

**File**: `src/pages/TenantDashboard.tsx`

## Key Implementation Details

### Database Filtering

All Supabase queries for tenant-specific data include the tenant filter:

```tsx
const { data: orders } = await supabase
  .from("orders")
  .select("*")
  .eq("tenant_id", selectedTenantId)  // Filter by selected tenant
  .order("created_at", { ascending: false });
```

### Role-Based Permissions

Admin users have elevated permissions:

- Access to **all tenant dashboards** (via tenant selection)
- Access to **all POS systems** (via tenant selection)
- Access to **Admin Dashboard** (exclusive to admin role)
- Can view **all tenants** in the system

Regular tenant users:

- Access only to **their own tenant dashboard**
- Access only to **their own POS system**
- Cannot select or view other tenants

### Navigation Menu

**Admin View**:
```
[CoffeeLane] [Admin Badge] [Tenant Selector ▼] | Frontend | Tenant Dashboard | Admin Dashboard | [User Menu]
```

**Tenant View**:
```
[CoffeeLane] [Tenant Badge] | Frontend | Tenant Dashboard | [User Menu]
```

## Security Considerations

### Row Level Security (RLS)

All database queries respect Supabase Row Level Security policies:

- Admin role can bypass tenant-specific RLS (has access to all tenants)
- Tenant role can only access their own tenant's data
- User role (staff) can only access their assigned tenant's data

**File**: `supabase/migrations/supabase-migration.sql`

### Frontend Validation

- Tenant context validates that selectedTenantId exists before allowing data access
- Admin role is verified before showing tenant selector
- All API calls include tenant_id to prevent data leakage

## User Experience

### Admin Workflow

1. **Login** as admin
2. **Navigate** to Admin Dashboard (default landing page)
3. **Select Tenant** from dropdown in navigation menu
4. **Access** POS or Tenant Dashboard to view/manage that tenant's operations
5. **Switch Tenants** anytime via dropdown without re-authentication

### Visual Indicators

- **Orange "Admin View" badge**: Appears when admin is viewing a tenant's dashboard or POS
- **Blue "Tenant" badge**: Appears for regular tenant users
- **Red "Admin" badge**: Appears in navigation for admin role identification

## Future Enhancements

Potential improvements for admin multi-tenant access:

- **Comparison View**: Side-by-side analytics for multiple tenants
- **Bulk Actions**: Manage products/settings across multiple tenants simultaneously
- **Tenant Activity Log**: Track which tenants the admin has accessed
- **Quick Tenant Switching**: Keyboard shortcuts or recent tenants list
- **Tenant Search**: Filter tenants by name, status, or location

## Files Modified

- `src/hooks/useTenantContext.tsx` - Tenant context provider
- `src/components/TenantSelector.tsx` - Tenant selection dropdown
- `src/components/DashboardNav.tsx` - Navigation with tenant selector
- `src/pages/POS.tsx` - POS with tenant filtering
- `src/pages/TenantDashboard.tsx` - Dashboard with tenant filtering
- `src/App.tsx` - TenantProvider wrapper

## Testing Admin Access

### Test Scenario 1: Admin Viewing Tenant POS

1. Login with admin credentials
2. Click "Tenant Selector" in navigation
3. Select a tenant (e.g., "Coffee Shop A")
4. Navigate to POS (`/pos`)
5. Verify "Admin View" badge appears
6. Create a test order
7. Verify order is attributed to selected tenant

### Test Scenario 2: Admin Viewing Tenant Dashboard

1. Login with admin credentials
2. Select a tenant from dropdown
3. Navigate to Tenant Dashboard (`/tenant`)
4. Verify "Admin View" badge appears
5. Verify statistics show only selected tenant's data
6. Switch to different tenant
7. Verify dashboard updates with new tenant's data

### Test Scenario 3: Tenant Isolation

1. Login as regular tenant user
2. Verify tenant selector is NOT visible
3. Navigate to dashboard - should only see own data
4. Attempt to access another tenant's data via URL manipulation - should be blocked by RLS

## Support

For issues or questions about admin multi-tenant access:

1. Check RLS policies in Supabase dashboard
2. Verify admin role assignment in `user_roles` table
3. Check browser console for tenant context errors
4. Review network tab for failed API calls with tenant_id filter
