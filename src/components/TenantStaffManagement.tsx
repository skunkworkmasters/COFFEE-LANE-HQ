import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantContext } from "@/hooks/useTenantContext";
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
import { Plus, Trash2, Users, Mail, UserCheck, Clock } from "lucide-react";

interface StaffMember {
  id: string;
  user_id: string;
  role: string;
  tenant_id: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export function TenantStaffManagement() {
  const { selectedTenantId } = useTenantContext();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  // New staff form state
  const [newStaff, setNewStaff] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });

  useEffect(() => {
    if (selectedTenantId) {
      fetchStaff();
    }
  }, [selectedTenantId]);

  const fetchStaff = async () => {
    if (!selectedTenantId) return;

    try {
      setLoading(true);

      // Fetch user roles for this tenant with role = 'user' (staff)
      const { data: staffRoles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*")
        .eq("tenant_id", selectedTenantId)
        .eq("role", "user");

      if (rolesError) throw rolesError;

      // Fetch profiles for each staff member
      const staffWithProfiles = await Promise.all(
        (staffRoles || []).map(async (staffRole) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", staffRole.user_id)
            .single();

          return {
            ...staffRole,
            profiles: profile,
          };
        })
      );

      setStaff(staffWithProfiles);
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
    if (!selectedTenantId) return;

    // Validation
    if (!newStaff.first_name || !newStaff.last_name || !newStaff.email || !newStaff.password) {
      toast({
        title: "Validation Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newStaff.email)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    // Password validation
    if (newStaff.password.length < 6) {
      toast({
        title: "Validation Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create auth user with Supabase Auth
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

      if (!authData.user) {
        throw new Error("Failed to create user account");
      }

      // Create user role entry
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: "user",
        tenant_id: selectedTenantId,
      });

      if (roleError) throw roleError;

      toast({
        title: "Success",
        description: `Staff member ${newStaff.first_name} ${newStaff.last_name} has been added`,
      });

      // Reset form and close dialog
      setNewStaff({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
      });
      setDialogOpen(false);

      // Refresh staff list
      fetchStaff();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveStaff = async (staffMember: StaffMember) => {
    if (!confirm(`Are you sure you want to remove ${staffMember.profiles?.full_name || "this staff member"}? They will no longer have access to the POS system.`)) {
      return;
    }

    try {
      // Delete user role entry
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("id", staffMember.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Staff member removed successfully",
      });

      // Refresh staff list
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
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Loading staff...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Staff Management
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Manage staff members who can access the POS system
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Staff Member</DialogTitle>
              <DialogDescription>
                Create a new staff account with POS access
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first-name">First Name *</Label>
                  <Input
                    id="first-name"
                    placeholder="John"
                    value={newStaff.first_name}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, first_name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="last-name">Last Name *</Label>
                  <Input
                    id="last-name"
                    placeholder="Doe"
                    value={newStaff.last_name}
                    onChange={(e) =>
                      setNewStaff({ ...newStaff, last_name: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={newStaff.email}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, email: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Staff will use this email to login
                </p>
              </div>
              <div>
                <Label htmlFor="password">Initial Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={newStaff.password}
                  onChange={(e) =>
                    setNewStaff({ ...newStaff, password: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum 6 characters. Staff can change this after first login.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddStaff}>Add Staff Member</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {staff.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground mb-2">No staff members yet</p>
            <p className="text-sm text-muted-foreground">
              Add staff members to give them access to the POS system
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Added On</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((staffMember) => (
                <TableRow key={staffMember.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-muted-foreground" />
                      {staffMember.profiles?.full_name || "N/A"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {staffMember.profiles?.email || "N/A"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Active
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      {new Date(staffMember.created_at).toLocaleDateString()}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRemoveStaff(staffMember)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
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
