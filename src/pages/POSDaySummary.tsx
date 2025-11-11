import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenantContext } from "@/hooks/useTenantContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Coffee, ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

export default function POSDaySummary() {
  const { user, loading: authLoading } = useAuth();
  const { selectedTenantId } = useTenantContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (selectedTenantId) {
      fetchTodaysOrders();
    }
  }, [selectedTenantId]);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm]);

  const fetchTodaysOrders = async () => {
    try {
      setLoading(true);

      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Fetch today's orders
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("id, order_number, total, status, created_at, staff_user_id")
        .eq("tenant_id", selectedTenantId)
        .gte("created_at", today.toISOString())
        .lt("created_at", tomorrow.toISOString())
        .order("created_at", { ascending: false });

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

  const filterOrders = () => {
    if (!searchTerm) {
      setFilteredOrders(orders);
      return;
    }

    const filtered = orders.filter(
      (order) =>
        order.order_number.includes(searchTerm) ||
        order.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.order_items?.some((item) =>
          item.product_name.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    setFilteredOrders(filtered);
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const getSubtotal = (items: OrderItem[]) => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Coffee className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate("/pos")}
              variant="ghost"
              size="icon"
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Coffee className="w-8 h-8" />
            <h1 className="text-2xl font-bold">Today's Orders</h1>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-90">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6 space-y-6">
        {/* Search and Orders */}
        <Card>
          <CardHeader>
            <CardTitle>Order History</CardTitle>
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by order #, staff, or product..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <Coffee className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? "No orders match your search" : "No orders today yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order) => (
                  <Card
                    key={order.id}
                    className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleViewDetails(order)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-xl">#{order.order_number}</p>
                          <span className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {order.profiles?.full_name || "Staff"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {order.order_items?.length || 0} item(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-2xl text-primary">
                          ${Number(order.total).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Back Button */}
        <div className="flex justify-center">
          <Button onClick={() => navigate("/pos")} size="lg" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to POS
          </Button>
        </div>
      </div>

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
    </div>
  );
}
