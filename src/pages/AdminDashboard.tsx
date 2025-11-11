import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Coffee, Building, Users, Plus, Edit, Package, Trash2, Power, PowerOff } from "lucide-react";
import { DashboardNav } from "@/components/DashboardNav";
import { ProductPoolManagement } from "@/components/ProductPoolManagement";
import { CategoryManagement } from "@/components/CategoryManagement";

export default function AdminDashboard() {
  const { user, userRole, loading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [productPoolCount, setProductPoolCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Tenant creation state
  const [tenantDialogOpen, setTenantDialogOpen] = useState(false);
  const [newTenant, setNewTenant] = useState({
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

  // Tenant editing state
  const [editTenantDialogOpen, setEditTenantDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<any>(null);

  // User creation state
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "user" as "admin" | "tenant" | "user",
    tenant_id: "",
  });

  // User editing state
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && (!user || userRole !== "admin")) {
      navigate("/auth");
    }
  }, [user, userRole, authLoading, navigate]);

  useEffect(() => {
    if (userRole === "admin") {
      fetchAdminData();
    }
  }, [userRole]);

  const fetchAdminData = async () => {
    try {
      // Fetch tenants
      const { data: tenantsData, error: tenantsError } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

      if (tenantsError) {
        console.error("Error fetching tenants:", tenantsError);
        throw tenantsError;
      }

      console.log("Fetched tenants:", tenantsData);
      setTenants(tenantsData || []);

      // Fetch product pool count
      const { count: poolCount, error: poolError } = await supabase
        .from("product_pool")
        .select("*", { count: "exact", head: true });

      if (!poolError) {
        setProductPoolCount(poolCount || 0);
      }

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Fetch profiles and tenant names separately and merge
      const usersWithDetails = await Promise.all(
        (rolesData || []).map(async (userRole) => {
          // Fetch user profile
          const { data: profileData } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", userRole.user_id)
            .single();

          // Fetch tenant name if user has a tenant
          let tenantData = null;
          if (userRole.tenant_id) {
            const { data } = await supabase
              .from("tenants")
              .select("name")
              .eq("id", userRole.tenant_id)
              .single();
            tenantData = data;
          }

          return {
            ...userRole,
            profiles: profileData,
            tenants: tenantData
          };
        })
      );

      setUsers(usersWithDetails || []);
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

  const handleCreateTenant = async () => {
    if (!newTenant.name || !newTenant.slug) {
      toast({
        title: "Validation Error",
        description: "Name and slug are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("tenants").insert({
        name: newTenant.name,
        slug: newTenant.slug.toLowerCase().replace(/\s+/g, "-"),
        city: newTenant.city || null,
        region: newTenant.region || null,
        country: newTenant.country || null,
        address: newTenant.address || null,
        language: newTenant.language || "en",
        staff_size: newTenant.staff_size ? parseInt(newTenant.staff_size) : null,
        contact_email: newTenant.contact_email || null,
        contact_phone: newTenant.contact_phone || null,
        active: true,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tenant created successfully",
      });

      setTenantDialogOpen(false);
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
      fetchAdminData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditTenant = (tenant: any) => {
    setEditingTenant(tenant);
    setEditTenantDialogOpen(true);
  };

  const handleUpdateTenant = async () => {
    if (!editingTenant || !editingTenant.name || !editingTenant.slug) {
      toast({
        title: "Validation Error",
        description: "Name and slug are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("tenants")
        .update({
          name: editingTenant.name,
          slug: editingTenant.slug.toLowerCase().replace(/\s+/g, "-"),
          city: editingTenant.city || null,
          region: editingTenant.region || null,
          country: editingTenant.country || null,
          address: editingTenant.address || null,
          language: editingTenant.language || "en",
          staff_size: editingTenant.staff_size ? parseInt(editingTenant.staff_size) : null,
          contact_email: editingTenant.contact_email || null,
          contact_phone: editingTenant.contact_phone || null,
        })
        .eq("id", editingTenant.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tenant updated successfully",
      });

      setEditTenantDialogOpen(false);
      setEditingTenant(null);
      fetchAdminData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleTenantStatus = async (tenantId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("tenants")
        .update({ active: !currentStatus })
        .eq("id", tenantId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Tenant ${!currentStatus ? "activated" : "suspended"} successfully`,
      });

      fetchAdminData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteTenant = async (tenantId: string, tenantName: string) => {
    if (!confirm(`Are you sure you want to delete "${tenantName}"? This action cannot be undone and will delete all associated data.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("tenants")
        .delete()
        .eq("id", tenantId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Tenant deleted successfully",
      });

      fetchAdminData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name || !newUser.role) {
      toast({
        title: "Validation Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }

    if (newUser.role !== "admin" && !newUser.tenant_id) {
      toast({
        title: "Validation Error",
        description: "Tenant is required for non-admin users",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.full_name,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Failed to create user");
      }

      // Create user role
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: newUser.role,
        tenant_id: newUser.role === "admin" ? null : newUser.tenant_id,
      });

      if (roleError) throw roleError;

      toast({
        title: "Success",
        description: "User created successfully",
      });

      setUserDialogOpen(false);
      setNewUser({
        email: "",
        password: "",
        full_name: "",
        role: "user",
        tenant_id: "",
      });
      fetchAdminData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditUser = (userRole: any) => {
    setEditingUser({
      id: userRole.id,
      user_id: userRole.user_id,
      role: userRole.role,
      tenant_id: userRole.tenant_id || "",
      email: userRole.profiles?.email,
      full_name: userRole.profiles?.full_name,
    });
    setEditUserDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    if (editingUser.role !== "admin" && !editingUser.tenant_id) {
      toast({
        title: "Validation Error",
        description: "Tenant is required for non-admin users",
        variant: "destructive",
      });
      return;
    }

    try {
      // Update user role
      const { error } = await supabase
        .from("user_roles")
        .update({
          role: editingUser.role,
          tenant_id: editingUser.role === "admin" ? null : editingUser.tenant_id,
        })
        .eq("id", editingUser.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User updated successfully",
      });

      setEditUserDialogOpen(false);
      setEditingUser(null);
      fetchAdminData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Coffee className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage tenants, users, and system settings</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
              <Building className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tenants.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Product Pool</CardTitle>
              <Package className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{productPoolCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Master products</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="tenants" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tenants">Tenants</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="products">Product Pool</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="tenants" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Tenant Management</CardTitle>
                <Dialog open={tenantDialogOpen} onOpenChange={setTenantDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Tenant
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Tenant</DialogTitle>
                      <DialogDescription>
                        Add a new coffee shop tenant to the platform
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Label htmlFor="tenant-name">Tenant Name *</Label>
                          <Input
                            id="tenant-name"
                            placeholder="Coffee Shop Name"
                            value={newTenant.name}
                            onChange={(e) =>
                              setNewTenant({ ...newTenant, name: e.target.value })
                            }
                          />
                        </div>
                        <div className="col-span-2">
                          <Label htmlFor="tenant-slug">Slug *</Label>
                          <Input
                            id="tenant-slug"
                            placeholder="coffee-shop-slug"
                            value={newTenant.slug}
                            onChange={(e) =>
                              setNewTenant({ ...newTenant, slug: e.target.value })
                            }
                          />
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">Location Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="tenant-city">City</Label>
                            <Input
                              id="tenant-city"
                              placeholder="New York"
                              value={newTenant.city}
                              onChange={(e) =>
                                setNewTenant({ ...newTenant, city: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="tenant-region">Region/State</Label>
                            <Input
                              id="tenant-region"
                              placeholder="NY"
                              value={newTenant.region}
                              onChange={(e) =>
                                setNewTenant({ ...newTenant, region: e.target.value })
                              }
                            />
                          </div>
                          <div className="col-span-2">
                            <Label htmlFor="tenant-country">Country</Label>
                            <Input
                              id="tenant-country"
                              placeholder="United States"
                              value={newTenant.country}
                              onChange={(e) =>
                                setNewTenant({ ...newTenant, country: e.target.value })
                              }
                            />
                          </div>
                          <div className="col-span-2">
                            <Label htmlFor="tenant-address">Address</Label>
                            <Input
                              id="tenant-address"
                              placeholder="123 Main St, Suite 100"
                              value={newTenant.address}
                              onChange={(e) =>
                                setNewTenant({ ...newTenant, address: e.target.value })
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">Contact Information</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="tenant-contact-email">Contact Email</Label>
                            <Input
                              id="tenant-contact-email"
                              type="email"
                              placeholder="manager@coffeeshop.com"
                              value={newTenant.contact_email}
                              onChange={(e) =>
                                setNewTenant({ ...newTenant, contact_email: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label htmlFor="tenant-contact-phone">Contact Phone</Label>
                            <Input
                              id="tenant-contact-phone"
                              type="tel"
                              placeholder="+1 (555) 123-4567"
                              value={newTenant.contact_phone}
                              onChange={(e) =>
                                setNewTenant({ ...newTenant, contact_phone: e.target.value })
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">Business Details</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="tenant-language">Language</Label>
                            <Select
                              value={newTenant.language}
                              onValueChange={(value) =>
                                setNewTenant({ ...newTenant, language: value })
                              }
                            >
                              <SelectTrigger id="tenant-language">
                                <SelectValue placeholder="Select language" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="en">English</SelectItem>
                                <SelectItem value="es">Spanish</SelectItem>
                                <SelectItem value="fr">French</SelectItem>
                                <SelectItem value="de">German</SelectItem>
                                <SelectItem value="it">Italian</SelectItem>
                                <SelectItem value="pt">Portuguese</SelectItem>
                                <SelectItem value="zh">Chinese</SelectItem>
                                <SelectItem value="ja">Japanese</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="tenant-staff-size">Staff Size</Label>
                            <Input
                              id="tenant-staff-size"
                              type="number"
                              placeholder="10"
                              value={newTenant.staff_size}
                              onChange={(e) =>
                                setNewTenant({ ...newTenant, staff_size: e.target.value })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setTenantDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateTenant}>Create Tenant</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {tenants.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No tenants yet</p>
                ) : (
                  <div className="space-y-4">
                    {tenants.map((tenant) => (
                      <div
                        key={tenant.id}
                        className="flex justify-between items-center border-b pb-3 last:border-0"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{tenant.name}</p>
                          <p className="text-sm text-muted-foreground">Slug: {tenant.slug}</p>
                          <p className="text-sm text-muted-foreground">
                            Code: {tenant.tenant_code || "N/A"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Created: {new Date(tenant.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-sm ${
                              tenant.active
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                            }`}
                          >
                            {tenant.active ? "Active" : "Suspended"}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditTenant(tenant)}
                            title="Edit tenant"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={tenant.active ? "outline" : "default"}
                            onClick={() => handleToggleTenantStatus(tenant.id, tenant.active)}
                            title={tenant.active ? "Suspend tenant" : "Activate tenant"}
                          >
                            {tenant.active ? (
                              <PowerOff className="w-4 h-4" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteTenant(tenant.id, tenant.name)}
                            title="Delete tenant"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>User Management</CardTitle>
                <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New User</DialogTitle>
                      <DialogDescription>
                        Add a new user and assign them to a tenant
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="user-name">Full Name</Label>
                        <Input
                          id="user-name"
                          placeholder="John Doe"
                          value={newUser.full_name}
                          onChange={(e) =>
                            setNewUser({ ...newUser, full_name: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="user-email">Email</Label>
                        <Input
                          id="user-email"
                          type="email"
                          placeholder="user@example.com"
                          value={newUser.email}
                          onChange={(e) =>
                            setNewUser({ ...newUser, email: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="user-password">Password</Label>
                        <Input
                          id="user-password"
                          type="password"
                          placeholder="••••••••"
                          value={newUser.password}
                          onChange={(e) =>
                            setNewUser({ ...newUser, password: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="user-role">Role</Label>
                        <Select
                          value={newUser.role}
                          onValueChange={(value: "admin" | "tenant" | "user") =>
                            setNewUser({ ...newUser, role: value })
                          }
                        >
                          <SelectTrigger id="user-role">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin (Super Admin)</SelectItem>
                            <SelectItem value="tenant">Tenant (Shop Owner)</SelectItem>
                            <SelectItem value="user">User (Staff)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {newUser.role !== "admin" && (
                        <div>
                          <Label htmlFor="user-tenant">Tenant</Label>
                          <Select
                            value={newUser.tenant_id}
                            onValueChange={(value) =>
                              setNewUser({ ...newUser, tenant_id: value })
                            }
                          >
                            <SelectTrigger id="user-tenant">
                              <SelectValue placeholder="Select tenant" />
                            </SelectTrigger>
                            <SelectContent>
                              {tenants.map((tenant) => (
                                <SelectItem key={tenant.id} value={tenant.id}>
                                  {tenant.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateUser}>Create User</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No users yet</p>
                ) : (
                  <div className="space-y-4">
                    {users.map((userRole) => (
                      <div
                        key={userRole.id}
                        className="flex justify-between items-center border-b pb-3 last:border-0"
                      >
                        <div className="flex-1">
                          <p className="font-medium">
                            {userRole.profiles?.full_name || userRole.profiles?.email || "Unknown"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {userRole.profiles?.email}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Tenant: {userRole.tenants?.name || "N/A"}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-3 py-1 rounded-full text-sm ${
                              userRole.role === "admin"
                                ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                                : userRole.role === "tenant"
                                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                : "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            }`}
                          >
                            {userRole.role}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUser(userRole)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <ProductPoolManagement />
          </TabsContent>

          <TabsContent value="categories" className="space-y-4">
            <CategoryManagement />
          </TabsContent>
        </Tabs>
      </main>

      {/* Edit User Dialog */}
      <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User Role & Tenant</DialogTitle>
            <DialogDescription>
              Update the user's role and tenant assignment
            </DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label>User</Label>
                <Input
                  value={editingUser.full_name || editingUser.email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={editingUser.email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div>
                <Label htmlFor="edit-user-role">Role</Label>
                <Select
                  value={editingUser.role}
                  onValueChange={(value: "admin" | "tenant" | "user") =>
                    setEditingUser({ ...editingUser, role: value })
                  }
                >
                  <SelectTrigger id="edit-user-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin (Super Admin)</SelectItem>
                    <SelectItem value="tenant">Tenant (Shop Owner)</SelectItem>
                    <SelectItem value="user">User (Staff)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingUser.role !== "admin" && (
                <div>
                  <Label htmlFor="edit-user-tenant">Tenant</Label>
                  <Select
                    value={editingUser.tenant_id}
                    onValueChange={(value) =>
                      setEditingUser({ ...editingUser, tenant_id: value })
                    }
                  >
                    <SelectTrigger id="edit-user-tenant">
                      <SelectValue placeholder="Select tenant" />
                    </SelectTrigger>
                    <SelectContent>
                      {tenants.map((tenant) => (
                        <SelectItem key={tenant.id} value={tenant.id}>
                          {tenant.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditUserDialogOpen(false);
                setEditingUser(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>Update User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tenant Dialog */}
      <Dialog open={editTenantDialogOpen} onOpenChange={setEditTenantDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
            <DialogDescription>
              Update tenant information
            </DialogDescription>
          </DialogHeader>
          {editingTenant && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="edit-tenant-name">Tenant Name *</Label>
                  <Input
                    id="edit-tenant-name"
                    value={editingTenant.name || ""}
                    onChange={(e) =>
                      setEditingTenant({ ...editingTenant, name: e.target.value })
                    }
                    placeholder="Coffee Shop Name"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-tenant-slug">Slug *</Label>
                  <Input
                    id="edit-tenant-slug"
                    value={editingTenant.slug || ""}
                    onChange={(e) =>
                      setEditingTenant({ ...editingTenant, slug: e.target.value })
                    }
                    placeholder="coffee-shop-slug"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Tenant Code</Label>
                  <Input
                    value={editingTenant.tenant_code || "Auto-generated"}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Tenant code is auto-generated and cannot be changed
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Location Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-tenant-city">City</Label>
                    <Input
                      id="edit-tenant-city"
                      placeholder="New York"
                      value={editingTenant.city || ""}
                      onChange={(e) =>
                        setEditingTenant({ ...editingTenant, city: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-tenant-region">Region/State</Label>
                    <Input
                      id="edit-tenant-region"
                      placeholder="NY"
                      value={editingTenant.region || ""}
                      onChange={(e) =>
                        setEditingTenant({ ...editingTenant, region: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="edit-tenant-country">Country</Label>
                    <Input
                      id="edit-tenant-country"
                      placeholder="United States"
                      value={editingTenant.country || ""}
                      onChange={(e) =>
                        setEditingTenant({ ...editingTenant, country: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="edit-tenant-address">Address</Label>
                    <Input
                      id="edit-tenant-address"
                      placeholder="123 Main St, Suite 100"
                      value={editingTenant.address || ""}
                      onChange={(e) =>
                        setEditingTenant({ ...editingTenant, address: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-tenant-contact-email">Contact Email</Label>
                    <Input
                      id="edit-tenant-contact-email"
                      type="email"
                      placeholder="manager@coffeeshop.com"
                      value={editingTenant.contact_email || ""}
                      onChange={(e) =>
                        setEditingTenant({ ...editingTenant, contact_email: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-tenant-contact-phone">Contact Phone</Label>
                    <Input
                      id="edit-tenant-contact-phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={editingTenant.contact_phone || ""}
                      onChange={(e) =>
                        setEditingTenant({ ...editingTenant, contact_phone: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Business Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-tenant-language">Language</Label>
                    <Select
                      value={editingTenant.language || "en"}
                      onValueChange={(value) =>
                        setEditingTenant({ ...editingTenant, language: value })
                      }
                    >
                      <SelectTrigger id="edit-tenant-language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="it">Italian</SelectItem>
                        <SelectItem value="pt">Portuguese</SelectItem>
                        <SelectItem value="zh">Chinese</SelectItem>
                        <SelectItem value="ja">Japanese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-tenant-staff-size">Staff Size</Label>
                    <Input
                      id="edit-tenant-staff-size"
                      type="number"
                      placeholder="10"
                      value={editingTenant.staff_size || ""}
                      onChange={(e) =>
                        setEditingTenant({ ...editingTenant, staff_size: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditTenantDialogOpen(false);
                setEditingTenant(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateTenant}>Update Tenant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
