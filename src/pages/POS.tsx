import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenantContext } from "@/hooks/useTenantContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Coffee, Trash2, LogOut, Check, X, Plus, Minus, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TenantSelector } from "@/components/TenantSelector";

interface Product {
  id: string;
  name: string;
  base_price: number;
  unit: string;
  image_url: string | null;
  portions: {
    id: string;
    name: string;
    price_modifier: number;
  }[];
}

interface CartItem {
  productId: string;
  portionId: string | null;
  productName: string;
  portionName: string | null;
  quantity: number;
  unitPrice: number;
}

interface OrderData {
  order_number: string;
  created_at: string;
  total: number;
}

export default function POS() {
  const { user, userRole, loading: authLoading, signOut } = useAuth();
  const { selectedTenantId } = useTenantContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showInvoice, setShowInvoice] = useState(false);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [productAvailability, setProductAvailability] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (selectedTenantId) {
      fetchProducts();
    }
  }, [selectedTenantId]);

  // Initialize all products as available
  useEffect(() => {
    const availability: Record<string, boolean> = {};
    products.forEach((product) => {
      if (productAvailability[product.id] === undefined) {
        availability[product.id] = true; // Default to available
      }
    });
    if (Object.keys(availability).length > 0) {
      setProductAvailability((prev) => ({ ...prev, ...availability }));
    }
  }, [products]);

  const toggleProductAvailability = (productId: string) => {
    setProductAvailability((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  const isProductAvailable = (productId: string) => {
    return productAvailability[productId] !== false; // Default to true if not set
  };

  const fetchProducts = async () => {
    if (!selectedTenantId) {
      console.warn("No tenant selected, cannot fetch products");
      return;
    }

    const { data, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        base_price,
        unit,
        image_url,
        product_portions (
          id,
          name,
          price_modifier
        )
      `)
      .eq("tenant_id", selectedTenantId)
      .eq("active", true)
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
      return;
    }

    setProducts(
      data.map((p: any) => ({
        ...p,
        portions: p.product_portions || [],
      }))
    );
  };

  // Text-to-Speech function
  const speakProductName = (productName: string, portionName?: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(
        portionName ? `${portionName} ${productName}` : productName
      );
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;

      window.speechSynthesis.speak(utterance);
    }
  };

  const addToCart = (product: Product, portion: { id: string; name: string; price_modifier: number } | null, quantity: number = 1) => {
    // Check if product is available
    if (!isProductAvailable(product.id)) {
      toast({
        title: "Product Unavailable",
        description: `${product.name} is currently not available`,
        variant: "destructive",
      });
      return;
    }

    const unitPrice = product.base_price + (portion?.price_modifier || 0);

    // Speak the product name
    speakProductName(product.name, portion?.name || undefined);

    const existingIndex = cart.findIndex(
      (item) => item.productId === product.id && item.portionId === (portion?.id || null)
    );

    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += quantity;
      setCart(newCart);
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          portionId: portion?.id || null,
          productName: product.name,
          portionName: portion?.name || null,
          quantity,
          unitPrice,
        },
      ]);
    }
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const updateCartQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    const newCart = [...cart];
    newCart[index].quantity = newQuantity;
    setCart(newCart);
  };

  const incrementQuantity = (index: number) => {
    const newCart = [...cart];
    newCart[index].quantity += 1;
    setCart(newCart);
  };

  const decrementQuantity = (index: number) => {
    const newCart = [...cart];
    if (newCart[index].quantity > 1) {
      newCart[index].quantity -= 1;
      setCart(newCart);
    }
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  };

  const completeOrder = async () => {
    if (cart.length === 0 || !user || !selectedTenantId) return;

    try {
      const total = getTotalPrice();

      const { data: orderDataResult, error: orderError } = await supabase
        .from("orders")
        .insert({
          tenant_id: selectedTenantId,
          staff_user_id: user.id,
          total,
          status: "completed",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map((item) => ({
        order_id: orderDataResult.id,
        product_id: item.productId,
        portion_id: item.portionId,
        product_name: item.productName,
        portion_name: item.portionName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.quantity * item.unitPrice,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      setOrderData(orderDataResult);
      setShowInvoice(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startNewOrder = () => {
    setCart([]);
    setShowInvoice(false);
    setOrderData(null);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Coffee className="w-16 h-16 animate-spin text-primary" />
      </div>
    );
  }

  // Invoice/Receipt Screen
  if (showInvoice && orderData) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <Card className="max-w-2xl w-full p-12 shadow-2xl">
          <div className="space-y-8">
            {/* Header */}
            <div className="text-center border-b-2 pb-6">
              <div className="flex justify-center mb-4">
                <img src="/logo(800 x 200 px) (800 x 100 px).png" alt="Nomad Bean Co." className="h-24 w-auto" />
              </div>
              <p className="text-xl text-muted-foreground">Order Receipt</p>
            </div>

            {/* Order Info */}
            <div className="grid grid-cols-2 gap-4 text-lg">
              <div>
                <p className="text-muted-foreground">Order Number</p>
                <p className="font-bold text-2xl">#{orderData.order_number}</p>
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Date & Time</p>
                <p className="font-semibold">
                  {new Date(orderData.created_at).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Order Items */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold border-b pb-3">Order Items</h2>
              {cart.map((item, index) => (
                <div key={index} className="flex justify-between items-center py-3 border-b text-lg">
                  <div className="flex-1">
                    <p className="font-semibold">
                      {item.quantity}x {item.productName}
                    </p>
                    {item.portionName && (
                      <p className="text-muted-foreground text-sm">({item.portionName})</p>
                    )}
                  </div>
                  <p className="font-bold text-xl">
                    ${(item.quantity * item.unitPrice).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="bg-primary/10 p-6 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-3xl font-bold">TOTAL</span>
                <span className="text-4xl font-bold text-primary">
                  ${getTotalPrice().toFixed(2)}
                </span>
              </div>
            </div>

            {/* Next Order Button */}
            <Button
              onClick={startNewOrder}
              size="lg"
              className="w-full h-20 text-2xl font-bold"
            >
              Next Order
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Admin needs to select a tenant first
  if (userRole === "admin" && !selectedTenantId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <Card className="max-w-md w-full p-8 text-center space-y-6">
          <Coffee className="w-16 h-16 mx-auto text-muted-foreground" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Select a Tenant</h2>
            <p className="text-muted-foreground">
              Please select a tenant from the navigation menu to access their POS system.
            </p>
          </div>
          <TenantSelector />
        </Card>
      </div>
    );
  }

  // Main POS Screen - Tablet Optimized
  return (
    <div className="min-h-screen bg-background">
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-4 shadow-lg">
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo(800 x 200 px) (800 x 100 px).png" alt="Nomad Bean Co." className="h-10 w-auto brightness-0 invert" />
              {userRole === "admin" && (
                <span className="text-xs bg-primary-foreground/20 px-2 py-1 rounded">
                  Admin View
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate("/pos/day-summary")}
                variant="ghost"
                size="sm"
                className="text-primary-foreground hover:bg-primary-foreground/20 gap-2"
                title="View Today's Orders"
              >
                <ClipboardList className="w-4 h-4" />
                Day Summary
              </Button>
              <div className="text-right">
                <p className="text-sm opacity-90">Staff: {user?.email?.split('@')[0]}</p>
              </div>
              <Button
                onClick={signOut}
                variant="ghost"
                size="icon"
                className="text-primary-foreground hover:bg-primary-foreground/20"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Products Grid - Left Side (60%) */}
          <div className="flex-1 overflow-y-auto p-6 bg-muted/30">
            <h2 className="text-2xl font-bold mb-6">Select Items</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => {
                const available = isProductAvailable(product.id);
                return (
                  <div key={product.id} className="space-y-2">
                    {/* Product Card - Large Image */}
                    <Card
                      className={`overflow-hidden relative ${
                        available
                          ? "cursor-pointer hover:shadow-xl transition-all transform hover:scale-105 active:scale-95"
                          : "opacity-60 cursor-not-allowed"
                      }`}
                    >
                      {/* Availability Toggle Buttons - Top Right */}
                      <div className="absolute top-2 right-2 z-10 flex gap-1">
                        <Button
                          size="icon"
                          variant={available ? "default" : "outline"}
                          className={`h-8 w-8 ${
                            available
                              ? "bg-green-600 hover:bg-green-700"
                              : "bg-background/80 hover:bg-green-600"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!available) toggleProductAvailability(product.id);
                          }}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant={!available ? "destructive" : "outline"}
                          className={`h-8 w-8 ${
                            !available
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-background/80 hover:bg-red-600"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (available) toggleProductAvailability(product.id);
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>

                      <div
                        className="aspect-square bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden"
                        onClick={() => available && product.portions.length === 0 && addToCart(product, null, 1)}
                      >
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Coffee className="w-24 h-24 text-primary/40" />
                        )}
                        {!available && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <p className="text-white font-bold text-lg">UNAVAILABLE</p>
                          </div>
                        )}
                      </div>
                      <div className="p-4 text-center bg-card">
                        <h3 className="font-bold text-xl mb-1">{product.name}</h3>
                        <p className="text-2xl font-bold text-primary">
                          ${product.base_price.toFixed(2)}
                        </p>
                      </div>
                    </Card>

                    {/* Quick Quantity Buttons - Only if no portions */}
                    {product.portions.length === 0 && available && (
                      <div className="grid grid-cols-3 gap-1">
                        {[1, 2, 3].map((qty) => (
                          <Button
                            key={qty}
                            onClick={() => addToCart(product, null, qty)}
                            variant="outline"
                            size="sm"
                            className="h-10 text-base font-bold"
                          >
                            +{qty}
                          </Button>
                        ))}
                      </div>
                    )}

                    {/* Portion Buttons */}
                    {product.portions.length > 0 && available && (
                      <div className="grid grid-cols-1 gap-2">
                        {product.portions.map((portion) => (
                          <Button
                            key={portion.id}
                            onClick={() => addToCart(product, portion, 1)}
                            variant="outline"
                            size="lg"
                            className="w-full h-14 text-lg font-semibold"
                          >
                            {portion.name}
                            {portion.price_modifier > 0 && ` +$${portion.price_modifier.toFixed(2)}`}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Current Order - Right Side (40%) */}
          <div className="w-[400px] bg-card border-l shadow-2xl flex flex-col">
            <div className="p-6 border-b bg-primary/5">
              <h2 className="text-2xl font-bold">Current Order</h2>
              <p className="text-muted-foreground">Tap items to add</p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Coffee className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-xl">No items yet</p>
                  <p className="text-sm">Tap products to add</p>
                </div>
              ) : (
                cart.map((item, index) => (
                  <Card key={index} className="p-4 hover:shadow-md transition-shadow">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-bold text-lg">
                            {item.productName}
                          </p>
                          {item.portionName && (
                            <p className="text-sm text-muted-foreground">
                              {item.portionName}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            ${item.unitPrice.toFixed(2)} each
                          </p>
                        </div>
                        <Button
                          onClick={() => removeFromCart(index)}
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => decrementQuantity(index)}
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="font-bold text-lg min-w-[3ch] text-center">
                            {item.quantity}
                          </span>
                          <Button
                            onClick={() => incrementQuantity(index)}
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="font-bold text-xl">
                          ${(item.quantity * item.unitPrice).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>

            <div className="p-6 border-t space-y-4 bg-primary/5">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold">TOTAL</span>
                <span className="text-4xl font-bold text-primary">
                  ${getTotalPrice().toFixed(2)}
                </span>
              </div>
              <Button
                onClick={completeOrder}
                disabled={cart.length === 0}
                className="w-full h-16 text-2xl font-bold"
                size="lg"
              >
                Complete Order
              </Button>
              {cart.length > 0 && (
                <Button
                  onClick={() => setCart([])}
                  variant="outline"
                  className="w-full h-12 text-lg"
                >
                  Clear Order
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
