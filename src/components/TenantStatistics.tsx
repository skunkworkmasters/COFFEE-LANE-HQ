import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Coffee, TrendingUp, Package, DollarSign } from "lucide-react";

interface Props {
  tenantId: string;
}

interface OrderStats {
  totalOrders: number;
  totalRevenue: number;
  avgOrderValue: number;
  topProducts: Array<{ product_name: string; total_quantity: number; total_revenue: number }>;
}

interface SalesData {
  date: string;
  revenue: number;
  orders: number;
}

export function TenantStatistics({ tenantId }: Props) {
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    topProducts: [],
  });
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [timeRange, setTimeRange] = useState<"7days" | "30days" | "90days">("30days");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (tenantId) {
      fetchStatistics();
    }
  }, [tenantId, timeRange]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);

      // Calculate date range
      const now = new Date();
      const startDate = new Date();
      if (timeRange === "7days") {
        startDate.setDate(now.getDate() - 7);
      } else if (timeRange === "30days") {
        startDate.setDate(now.getDate() - 30);
      } else if (timeRange === "90days") {
        startDate.setDate(now.getDate() - 90);
      }

      // Fetch orders with items
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select(`
          id,
          total,
          created_at,
          order_items (
            product_name,
            quantity,
            total_price
          )
        `)
        .eq("tenant_id", tenantId)
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: true });

      if (ordersError) throw ordersError;

      // Calculate overall stats
      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
      const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate top products
      const productMap = new Map<string, { quantity: number; revenue: number }>();
      orders?.forEach((order) => {
        order.order_items?.forEach((item: any) => {
          const existing = productMap.get(item.product_name) || { quantity: 0, revenue: 0 };
          productMap.set(item.product_name, {
            quantity: existing.quantity + item.quantity,
            revenue: existing.revenue + item.total_price,
          });
        });
      });

      const topProducts = Array.from(productMap.entries())
        .map(([name, data]) => ({
          product_name: name,
          total_quantity: data.quantity,
          total_revenue: data.revenue,
        }))
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 5);

      setStats({ totalOrders, totalRevenue, avgOrderValue, topProducts });

      // Calculate daily sales data
      const salesByDate = new Map<string, { revenue: number; orders: number }>();
      orders?.forEach((order) => {
        const date = new Date(order.created_at).toLocaleDateString();
        const existing = salesByDate.get(date) || { revenue: 0, orders: 0 };
        salesByDate.set(date, {
          revenue: existing.revenue + Number(order.total),
          orders: existing.orders + 1,
        });
      });

      const salesDataArray = Array.from(salesByDate.entries())
        .map(([date, data]) => ({
          date,
          revenue: data.revenue,
          orders: data.orders,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setSalesData(salesDataArray);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Coffee className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate max values for bar chart scaling
  const maxRevenue = Math.max(...salesData.map((d) => d.revenue), 1);
  const maxOrders = Math.max(...salesData.map((d) => d.orders), 1);

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Sales Analytics</h2>
        <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
            <SelectItem value="90days">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {timeRange === "7days" ? "Last 7 days" : timeRange === "30days" ? "Last 30 days" : "Last 90 days"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Completed orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.avgOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Per transaction
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Over Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Over Time</CardTitle>
          <p className="text-sm text-muted-foreground">
            Daily revenue and order count
          </p>
        </CardHeader>
        <CardContent>
          {salesData.length === 0 ? (
            <div className="text-center py-12">
              <Coffee className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No sales data for this period</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Revenue Chart */}
              <div>
                <h4 className="text-sm font-semibold mb-3 text-primary">Revenue ($)</h4>
                <div className="space-y-2">
                  {salesData.map((data, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="text-xs font-medium w-24 text-muted-foreground">
                        {data.date}
                      </div>
                      <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden relative">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${(data.revenue / maxRevenue) * 100}%` }}
                        />
                        <span className="absolute inset-0 flex items-center px-3 text-xs font-bold text-primary-foreground">
                          ${data.revenue.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Orders Chart */}
              <div className="pt-4 border-t">
                <h4 className="text-sm font-semibold mb-3 text-blue-600">Orders Count</h4>
                <div className="space-y-2">
                  {salesData.map((data, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="text-xs font-medium w-24 text-muted-foreground">
                        {data.date}
                      </div>
                      <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden relative">
                        <div
                          className="h-full bg-blue-600 transition-all duration-300"
                          style={{ width: `${(data.orders / maxOrders) * 100}%` }}
                        />
                        <span className="absolute inset-0 flex items-center px-3 text-xs font-bold text-white">
                          {data.orders} order{data.orders !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>Top Products</CardTitle>
          <p className="text-sm text-muted-foreground">
            Best performing products by revenue
          </p>
        </CardHeader>
        <CardContent>
          {stats.topProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No product data available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.topProducts.map((product, index) => {
                const maxProductRevenue = stats.topProducts[0]?.total_revenue || 1;
                const percentage = (product.total_revenue / maxProductRevenue) * 100;

                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-muted-foreground/40">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-semibold">{product.product_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.total_quantity} units sold
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">${product.total_revenue.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
