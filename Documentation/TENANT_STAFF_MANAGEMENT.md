# Tenant & Staff Management Enhancement - Implementation Guide

## Overview

This document outlines the implementation of two major features:
1. Enhanced tenant information management in Admin Dashboard
2. Staff management capabilities for Tenant Dashboard

## Status: PARTIALLY IMPLEMENTED

### Completed:
- ✅ Database migration created for new tenant fields
- ✅ TypeScript types updated
- ✅ State initialization updated in AdminDashboard.tsx

### Remaining Work:

## Part 1: Enhanced Tenant Information (Admin Dashboard)

### Database Migration

**File**: `supabase/migrations/20251109_add_tenant_details.sql`

New fields added to `tenants` table:
- `city` TEXT
- `region` TEXT (State/Province)
- `country` TEXT
- `address` TEXT
- `language` TEXT (default: 'en')
- `staff_size` INTEGER
- `contact_email` TEXT
- `contact_phone` TEXT

**Run this migration in Supabase SQL Editor before proceeding.**

### Admin Dashboard Updates Needed

**File**: `src/pages/AdminDashboard.tsx`

#### 1. Update `handleCreateTenant` function (around line 151):

Add new fields to the insert:
```typescript
const { error } = await supabase.from("tenants").insert({
  name: newTenant.name,
  slug: newTenant.slug.toLowerCase().replace(/\s+/g, "-"),
  city: newTenant.city || null,
  region: newTenant.region || null,
  country: newTenant.country || null,
  address: newTenant.address || null,
  language: newTenant.language || 'en',
  staff_size: newTenant.staff_size ? parseInt(newTenant.staff_size) : null,
  contact_email: newTenant.contact_email || null,
  contact_phone: newTenant.contact_phone || null,
  active: true,
});
```

After successful creation, reset form:
```typescript
setNewTenant({
  name: "",
  slug: "",
  city: "",
  region: "",
  country: "",
  address: "",
  language: "en",
  staff_size: "",
  contact_email: "",
  contact_phone: "",
});
```

#### 2. Update `handleUpdateTenant` function (around line 193):

```typescript
const { error } = await supabase
  .from("tenants")
  .update({
    name: editingTenant.name,
    slug: editingTenant.slug.toLowerCase().replace(/\s+/g, "-"),
    city: editingTenant.city || null,
    region: editingTenant.region || null,
    country: editingTenant.country || null,
    address: editingTenant.address || null,
    language: editingTenant.language || 'en',
    staff_size: editingTenant.staff_size ? parseInt(editingTenant.staff_size) : null,
    contact_email: editingTenant.contact_email || null,
    contact_phone: editingTenant.contact_phone || null,
  })
  .eq("id", editingTenant.id);
```

#### 3. Update Create Tenant Dialog (around line 475):

Add these fields after the existing slug and description fields:

```tsx
<div className="grid grid-cols-2 gap-4">
  <div>
    <Label htmlFor="tenant-city">City</Label>
    <Input
      id="tenant-city"
      value={newTenant.city}
      onChange={(e) => setNewTenant({ ...newTenant, city: e.target.value })}
      placeholder="e.g., New York"
    />
  </div>
  <div>
    <Label htmlFor="tenant-region">State/Region</Label>
    <Input
      id="tenant-region"
      value={newTenant.region}
      onChange={(e) => setNewTenant({ ...newTenant, region: e.target.value })}
      placeholder="e.g., NY"
    />
  </div>
</div>

<div>
  <Label htmlFor="tenant-country">Country</Label>
  <Input
    id="tenant-country"
    value={newTenant.country}
    onChange={(e) => setNewTenant({ ...newTenant, country: e.target.value })}
    placeholder="e.g., United States"
  />
</div>

<div>
  <Label htmlFor="tenant-address">Street Address</Label>
  <Input
    id="tenant-address"
    value={newTenant.address}
    onChange={(e) => setNewTenant({ ...newTenant, address: e.target.value })}
    placeholder="e.g., 123 Main St"
  />
</div>

<div className="grid grid-cols-2 gap-4">
  <div>
    <Label htmlFor="tenant-language">Language</Label>
    <Select value={newTenant.language} onValueChange={(value) => setNewTenant({ ...newTenant, language: value })}>
      <SelectTrigger id="tenant-language">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="es">Spanish</SelectItem>
        <SelectItem value="fr">French</SelectItem>
        <SelectItem value="de">German</SelectItem>
        <SelectItem value="it">Italian</SelectItem>
        <SelectItem value="pt">Portuguese</SelectItem>
      </SelectContent>
    </Select>
  </div>
  <div>
    <Label htmlFor="tenant-staff-size">Estimated Staff Size</Label>
    <Input
      id="tenant-staff-size"
      type="number"
      value={newTenant.staff_size}
      onChange={(e) => setNewTenant({ ...newTenant, staff_size: e.target.value })}
      placeholder="e.g., 10"
    />
  </div>
</div>

<div className="grid grid-cols-2 gap-4">
  <div>
    <Label htmlFor="tenant-email">Contact Email</Label>
    <Input
      id="tenant-email"
      type="email"
      value={newTenant.contact_email}
      onChange={(e) => setNewTenant({ ...newTenant, contact_email: e.target.value })}
      placeholder="e.g., manager@coffeeshop.com"
    />
  </div>
  <div>
    <Label htmlFor="tenant-phone">Contact Phone</Label>
    <Input
      id="tenant-phone"
      type="tel"
      value={newTenant.contact_phone}
      onChange={(e) => setNewTenant({ ...newTenant, contact_phone: e.target.value })}
      placeholder="e.g., +1 (555) 123-4567"
    />
  </div>
</div>
```

#### 4. Update Edit Tenant Dialog (around line 844):

Add the same fields to the edit dialog, but using `editingTenant` state.

---

## Part 2: Staff Management (Tenant Dashboard)

### Database Tables

No migration needed - we'll use the existing `profiles` and `user_roles` tables.

### New Component: Staff Management

**File**: `src/components/TenantStaffManagement.tsx` (CREATE THIS FILE)

```typescript
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Mail, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface StaffMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
}

interface Props {
  tenantId: string;
}

export function TenantStaffManagement({ tenantId }: Props) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    email: "",
    first_name: "",
    last_name: "",
    password: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchStaff();
  }, [tenantId]);

  const fetchStaff = async () => {
    try {
      setLoading(true);

      // Fetch all user_roles for this tenant with "user" role (staff)
      const { data: userRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select(`
          id,
          user_id,
          role,
          created_at,
          profiles (
            email,
            full_name
          )
        `)
        .eq("tenant_id", tenantId)
        .eq("role", "user");

      if (rolesError) throw rolesError;

      const staffMembers = (userRoles || []).map((ur: any) => ({
        id: ur.user_id,
        email: ur.profiles?.email || "N/A",
        full_name: ur.profiles?.full_name || "N/A",
        role: ur.role,
        created_at: ur.created_at,
      }));

      setStaff(staffMembers);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!newStaff.email || !newStaff.first_name || !newStaff.last_name || !newStaff.password) {
      toast({
        title: "Validation Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newStaff.email,
        password: newStaff.password,
        options: {
          data: {
            full_name: `${newStaff.first_name} ${newStaff.last_name}`,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Create user_role entry
        const { error: roleError } = await supabase.from("user_roles").insert({
          user_id: authData.user.id,
          tenant_id: tenantId,
          role: "user",
        });

        if (roleError) throw roleError;

        toast({
          title: "Success",
          description: "Staff member added successfully. They can now log in.",
        });

        setDialogOpen(false);
        setNewStaff({
          email: "",
          first_name: "",
          last_name: "",
          password: "",
        });
        fetchStaff();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveStaff = async (userId: string, email: string) => {
    if (!confirm(`Remove ${email} from staff? They will lose access to the POS system.`)) {
      return;
    }

    try {
      // Delete user_role entry
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("tenant_id", tenantId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Staff member removed successfully",
      });

      fetchStaff();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p>Loading staff...</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Staff Management</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Manage staff members who can access your POS system
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Staff Member</DialogTitle>
              <DialogDescription>
                Create a new account for a staff member to access the POS system
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first-name">First Name</Label>
                  <Input
                    id="first-name"
                    value={newStaff.first_name}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, first_name: e.target.value })
                    }
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input
                    id="last-name"
                    value={newStaff.last_name}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, last_name: e.target.value })
                    }
                    placeholder="Doe"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  placeholder="john.doe@example.com"
                />
              </div>
              <div>
                <Label htmlFor="password">Temporary Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newStaff.password}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, password: e.target.value })
                  }
                  placeholder="Minimum 6 characters"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Staff member should change this password after first login
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddStaff}>Add Staff</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {staff.length === 0 ? (
          <div className="text-center py-12">
            <User className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No staff members yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add staff members to give them access to your POS system
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Added On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((member) => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.full_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {member.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">Staff</Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(member.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveStaff(member.id, member.email)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
```

### Update Tenant Dashboard

**File**: `src/pages/TenantDashboard.tsx`

1. Import the new component:
```typescript
import { TenantStaffManagement } from "@/components/TenantStaffManagement";
```

2. Add a new tab in the Tabs component:
```tsx
<TabsList>
  <TabsTrigger value="overview">Overview</TabsTrigger>
  <TabsTrigger value="products">Products</TabsTrigger>
  <TabsTrigger value="orders">Orders</TabsTrigger>
  <TabsTrigger value="staff">Staff</TabsTrigger>  {/* NEW */}
</TabsList>
```

3. Add the tab content:
```tsx
<TabsContent value="staff">
  {selectedTenantId && <TenantStaffManagement tenantId={selectedTenantId} />}
</TabsContent>
```

---

## Implementation Steps

### Step 1: Database Setup
1. Run the tenant details migration in Supabase SQL Editor
2. Verify the new columns exist in the `tenants` table

### Step 2: Admin Dashboard (Tenant Info)
1. Update the `handleCreateTenant` function
2. Update the `handleUpdateTenant` function
3. Update the Create Tenant Dialog UI
4. Update the Edit Tenant Dialog UI
5. Update the tenant list display to show location info

### Step 3: Tenant Dashboard (Staff Management)
1. Create the `TenantStaffManagement.tsx` component
2. Import and add it to TenantDashboard.tsx
3. Add the "Staff" tab to the Tabs component
4. Test staff creation and removal

### Step 4: Testing
1. Admin creates/edits tenant with full information
2. Tenant admin adds staff members
3. Staff member logs in with their credentials
4. Staff member accesses POS
5. Tenant admin removes staff member
6. Verify removed staff cannot access POS

---

## Security Considerations

1. **Staff Creation**: Uses Supabase Auth for proper password hashing
2. **Staff Removal**: Only removes `user_roles` entry, preserves auth account
3. **Tenant Isolation**: Staff can only be added/removed for their own tenant
4. **RLS Policies**: Existing policies enforce tenant-level data separation

---

## Next Steps After Implementation

1. Add email verification for new staff accounts
2. Add password reset functionality
3. Add staff activity logging
4. Add bulk staff import via CSV
5. Add staff permissions/roles beyond just "user"
6. Add staff scheduling features

---

## Current Status

**Completed**: Database schema and TypeScript types
**In Progress**: Need to complete UI updates in AdminDashboard.tsx
**Pending**: Create TenantStaffManagement component and integrate

Due to the size of these changes, it's recommended to:
1. Apply the database migration first
2. Test manually in Supabase
3. Then update the UI components one at a time
4. Test each feature thoroughly before moving to the next
