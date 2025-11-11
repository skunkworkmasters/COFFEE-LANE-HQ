import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenantContext } from "@/hooks/useTenantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { Coffee, ShoppingBag, Package } from "lucide-react";
import { DashboardNav } from "@/components/DashboardNav";
import { TenantSelector } from "@/components/TenantSelector";
import { TenantProductSelection } from "@/components/TenantProductSelection";
import { TenantOrdersManagement } from "@/components/TenantOrdersManagement";
import { TenantStatistics } from "@/components/TenantStatistics";
import { TenantStaffManagement } from "@/components/TenantStaffManagement";

export default function TenantDashboard() {
  const { user, userRole, loading: authLoading } = useAuth();
  const { selectedTenantId, isAdminViewingTenant } = useTenantContext();
  const [stats, setStats] = useState({ totalOrders: 0, totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && (!user || (userRole !== "tenant" && userRole !== "admin"))) {
      navigate("/auth");
    }
  }, [user, userRole, authLoading, navigate]);

  useEffect(() => {
    if (selectedTenantId) {
      fetchDashboardData();
    }
  }, [selectedTenantId]);

  const fetchDashboardData = async () => {
    try {
      // Fetch orders filtered by selected tenant for stats
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, total")
        .eq("tenant_id", selectedTenantId);

      if (ordersError) throw ordersError;

      // Calculate stats
      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;

      setStats({ totalOrders, totalRevenue });
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

  // Admin needs to select a tenant first
  if (userRole === "admin" && !selectedTenantId) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav />
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-8">
          <Card className="max-w-md w-full p-8 text-center space-y-6">
            <Coffee className="w-16 h-16 mx-auto text-muted-foreground" />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Select a Tenant</h2>
              <p className="text-muted-foreground">
                Please select a tenant from the navigation menu to view their dashboard.
              </p>
            </div>
            <TenantSelector />
          </Card>
        </div>
      </div>
    );
  }

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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Tenant Dashboard</h1>
              {isAdminViewingTenant && (
                <span className="text-xs bg-amber-600 text-white px-3 py-1 rounded-full">
                  Admin View
                </span>
              )}
            </div>
            <p className="text-muted-foreground">Manage your coffee shop operations</p>
          </div>
          <Button onClick={() => navigate("/pos")} size="lg">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Open POS
          </Button>
        </div>
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingBag className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <Package className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              <Coffee className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.totalOrders > 0 ? (stats.totalRevenue / stats.totalOrders).toFixed(2) : "0.00"}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="statistics" className="space-y-4">
          <TabsList>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
          </TabsList>

          <TabsContent value="statistics" className="space-y-4">
            {selectedTenantId ? (
              <TenantStatistics tenantId={selectedTenantId} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    Please select a tenant to view statistics.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-4">
            {selectedTenantId ? (
              <TenantOrdersManagement tenantId={selectedTenantId} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Orders Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    Please select a tenant to view orders.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            {selectedTenantId ? (
              <TenantProductSelection tenantId={selectedTenantId} />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Product Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    Please select a tenant to manage products.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="staff" className="space-y-4">
            {selectedTenantId ? (
              <TenantStaffManagement />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Staff Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-center py-8">
                    Please select a tenant to manage staff.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
