import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Eye, Coffee, Calendar, ShoppingBag, DollarSign, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OrderItem {
  id: string;
  product_name: string;
  portion_name: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: string;
  order_number: string;
  total: number;
  status: string;
  created_at: string;
  staff_user_id: string;
  profiles?: {
    full_name: string;
    email: string;
  };
  order_items?: OrderItem[];
}

interface Props {
  tenantId: string;
}

export function TenantOrdersManagement({ tenantId }: Props) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");
  const [sortBy, setSortBy] = useState<"date" | "number" | "total">("date");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { toast } = useToast();

  // Today's stats
  const [todayStats, setTodayStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
  });

  useEffect(() => {
    if (tenantId) {
      fetchOrders();
    }
  }, [tenantId]);

  useEffect(() => {
    filterAndSortOrders();
  }, [orders, searchTerm, dateFilter, sortBy]);

  useEffect(() => {
    calculateTodayStats();
  }, [orders]);

  const calculateTodayStats = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayOrders = orders.filter((order) => {
      const orderDate = new Date(order.created_at);
      return orderDate >= today && orderDate < tomorrow;
    });

    const totalOrders = todayOrders.length;
    const totalRevenue = todayOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    setTodayStats({
      totalOrders,
      totalRevenue,
      avgOrderValue,
    });
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);

      console.log("Fetching orders for tenant:", tenantId);

      // Fetch orders first
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id, order_number, total, status, created_at, staff_user_id")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      console.log("Orders query result:", { data: ordersData, error: ordersError });

      if (ordersError) throw ordersError;

      // Fetch order items and staff profiles for each order
      const ordersWithItems = await Promise.all(
        (ordersData || []).map(async (order) => {
          // Fetch order items
          const { data: items } = await supabase
            .from("order_items")
            .select("*")
            .eq("order_id", order.id);

          // Fetch staff profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, email")
            .eq("id", order.staff_user_id)
            .single();

          return {
            ...order,
            profiles: profile,
            order_items: items || [],
          };
        })
      );

      setOrders(ordersWithItems);
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

  const filterAndSortOrders = () => {
    let filtered = [...orders];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.order_number.includes(searchTerm) ||
          order.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.order_items?.some((item) =>
            item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    // Apply date filter
    if (dateFilter !== "all") {
      const now = new Date();
      const filterDate = new Date();

      if (dateFilter === "today") {
        filterDate.setHours(0, 0, 0, 0);
      } else if (dateFilter === "week") {
        filterDate.setDate(now.getDate() - 7);
      } else if (dateFilter === "month") {
        filterDate.setMonth(now.getMonth() - 1);
      }

      filtered = filtered.filter(
        (order) => new Date(order.created_at) >= filterDate
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "number":
          return b.order_number.localeCompare(a.order_number);
        case "total":
          return Number(b.total) - Number(a.total);
        default:
          return 0;
      }
    });

    setFilteredOrders(filtered);
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const getSubtotal = (items: OrderItem[]) => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Coffee className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Today's Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              Total orders placed today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${todayStats.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Total revenue generated today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${todayStats.avgOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Average per order today
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Orders Management</CardTitle>
          <p className="text-sm text-muted-foreground">
            View and search all orders for your coffee shop
          </p>
        </CardHeader>
        <CardContent>
          {/* Filters and Search */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by order #, staff, or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={dateFilter} onValueChange={(value: any) => setDateFilter(value)}>
              <SelectTrigger className="w-[160px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Newest First</SelectItem>
                <SelectItem value="number">Order Number</SelectItem>
                <SelectItem value="total">Highest Total</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Orders Table */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <Coffee className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || dateFilter !== "all"
                  ? "No orders match your filters"
                  : "No orders yet"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        #{order.order_number}
                      </TableCell>
                      <TableCell>
                        {new Date(order.created_at).toLocaleDateString()}{" "}
                        <span className="text-muted-foreground">
                          {new Date(order.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {order.profiles?.full_name || "N/A"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.profiles?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {order.order_items && order.order_items.length > 0 ? (
                            <>
                              <span className="font-medium">
                                {order.order_items.length} item
                                {order.order_items.length !== 1 ? "s" : ""}
                              </span>
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {order.order_items
                                  .slice(0, 2)
                                  .map((item) => `${item.quantity}x ${item.product_name}`)
                                  .join(", ")}
                                {order.order_items.length > 2 && "..."}
                              </p>
                            </>
                          ) : (
                            <span className="text-muted-foreground">No items</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        ${order.order_items ? getSubtotal(order.order_items).toFixed(2) : "0.00"}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ${Number(order.total).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            order.status === "completed"
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                          }
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(order)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredOrders.length} of {orders.length} orders
          </div>
        </CardContent>
      </Card>

      {/* Order Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details - #{selectedOrder?.order_number}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                <div>
                  <p className="text-sm text-muted-foreground">Date & Time</p>
                  <p className="font-medium">
                    {new Date(selectedOrder.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Staff Member</p>
                  <p className="font-medium">
                    {selectedOrder.profiles?.full_name || "N/A"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedOrder.profiles?.email}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Order Number</p>
                  <p className="font-medium text-lg">#{selectedOrder.order_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    className={
                      selectedOrder.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }
                  >
                    {selectedOrder.status}
                  </Badge>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="font-semibold mb-4">Order Items</h3>
                <div className="space-y-3">
                  {selectedOrder.order_items?.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center p-3 bg-muted rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {item.quantity}x {item.product_name}
                        </p>
                        {item.portion_name && (
                          <p className="text-sm text-muted-foreground">
                            {item.portion_name}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          ${item.unit_price.toFixed(2)} each
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${item.total_price.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="space-y-2 pt-4 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>
                    ${selectedOrder.order_items ? getSubtotal(selectedOrder.order_items).toFixed(2) : "0.00"}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">${Number(selectedOrder.total).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
