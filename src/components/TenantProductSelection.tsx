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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Coffee, Plus, Edit, Trash2, ShoppingCart, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// RENAME: ProductCategory -> ServeTime
type ServeTime = "breakfast" | "brunch" | "lunch" | "afternoon" | "dinner" | "all day";

// NEW: Category interface
interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  description: string | null;
}

interface PoolProduct {
  id: string;
  name: string;
  description: string | null;
  serve_time: ServeTime;  // RENAMED from 'category'
  image_url: string | null;
  product_pool_categories?: Array<{
    category_id: string;
    product_categories: Category;
  }>;
}

interface TenantProduct {
  id: string;
  product_pool_id: string;
  tenant_id: string;
  name: string;
  base_price: number;
  quantity: number | null;
  active: boolean;
  pool_product?: PoolProduct;
}

const serveTimeLabels: Record<ServeTime, string> = {
  breakfast: "Breakfast",
  brunch: "Brunch",
  lunch: "Lunch",
  afternoon: "Afternoon",
  dinner: "Dinner",
  "all day": "All Day",
};

const serveTimeColors: Record<ServeTime, string> = {
  breakfast: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  brunch: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  lunch: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  afternoon: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  dinner: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  "all day": "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200",
};

interface GroupedProducts {
  [categoryId: string]: {
    category: Category;
    products: PoolProduct[];
  };
}

interface GroupedTenantProducts {
  [categoryId: string]: {
    category: Category;
    products: TenantProduct[];
  };
}

interface Props {
  tenantId: string;
}

export function TenantProductSelection({ tenantId }: Props) {
  const [poolProducts, setPoolProducts] = useState<PoolProduct[]>([]);
  const [tenantProducts, setTenantProducts] = useState<TenantProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const { toast } = useToast();

  // Category state
  const [categories, setCategories] = useState<Category[]>([]);
  const [groupedPoolProducts, setGroupedPoolProducts] = useState<GroupedProducts>({});
  const [groupedTenantProducts, setGroupedTenantProducts] = useState<GroupedTenantProducts>({});
  const [collapsedPoolCategories, setCollapsedPoolCategories] = useState<Set<string>>(new Set());
  const [collapsedTenantCategories, setCollapsedTenantCategories] = useState<Set<string>>(new Set());

  const [selectedPoolProduct, setSelectedPoolProduct] = useState<PoolProduct | null>(null);
  const [editingProduct, setEditingProduct] = useState<TenantProduct | null>(null);
  const [productForm, setProductForm] = useState({
    base_price: "",
    quantity: "",
  });

  useEffect(() => {
    if (tenantId) {
      fetchCategories();
      fetchData();
    }
  }, [tenantId]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchData = async () => {
    try {
      // Fetch pool products with categories
      const { data: poolData, error: poolError } = await supabase
        .from("product_pool")
        .select(`
          *,
          product_pool_categories (
            category_id,
            product_categories (
              id,
              name,
              slug,
              sort_order,
              description
            )
          )
        `)
        .order("serve_time", { ascending: true });

      if (poolError) throw poolError;
      setPoolProducts(poolData || []);
      groupPoolProductsByCategory(poolData || []);

      // Fetch tenant's products
      const { data: tenantData, error: tenantError } = await supabase
        .from("products")
        .select("*")
        .eq("tenant_id", tenantId)
        .not("product_pool_id", "is", null);

      if (tenantError) throw tenantError;

      // Enrich tenant products with pool product details (including categories)
      const enrichedProducts = await Promise.all(
        (tenantData || []).map(async (product) => {
          const { data: poolProduct } = await supabase
            .from("product_pool")
            .select(`
              *,
              product_pool_categories (
                category_id,
                product_categories (
                  id,
                  name,
                  slug,
                  sort_order,
                  description
                )
              )
            `)
            .eq("id", product.product_pool_id)
            .single();

          return {
            ...product,
            pool_product: poolProduct,
          };
        })
      );

      setTenantProducts(enrichedProducts as TenantProduct[]);
      groupTenantProductsByCategory(enrichedProducts as TenantProduct[]);
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

  const groupPoolProductsByCategory = (productsList: PoolProduct[]) => {
    const grouped: GroupedProducts = {};

    // Initialize with all categories
    categories.forEach(cat => {
      grouped[cat.id] = {
        category: cat,
        products: [],
      };
    });

    // Add "Uncategorized" category
    grouped["uncategorized"] = {
      category: {
        id: "uncategorized",
        name: "Uncategorized",
        slug: "uncategorized",
        sort_order: 999,
        description: "Products without categories",
      },
      products: [],
    };

    // Group products
    productsList.forEach(product => {
      if (!product.product_pool_categories || product.product_pool_categories.length === 0) {
        grouped["uncategorized"].products.push(product);
      } else {
        product.product_pool_categories.forEach(link => {
          const catId = link.product_categories.id;
          if (grouped[catId]) {
            grouped[catId].products.push(product);
          }
        });
      }
    });

    setGroupedPoolProducts(grouped);
  };

  const groupTenantProductsByCategory = (productsList: TenantProduct[]) => {
    const grouped: GroupedTenantProducts = {};

    // Initialize with all categories
    categories.forEach(cat => {
      grouped[cat.id] = {
        category: cat,
        products: [],
      };
    });

    // Add "Uncategorized" category
    grouped["uncategorized"] = {
      category: {
        id: "uncategorized",
        name: "Uncategorized",
        slug: "uncategorized",
        sort_order: 999,
        description: "Products without categories",
      },
      products: [],
    };

    // Group products
    productsList.forEach(product => {
      const poolProd = product.pool_product;
      if (!poolProd?.product_pool_categories || poolProd.product_pool_categories.length === 0) {
        grouped["uncategorized"].products.push(product);
      } else {
        poolProd.product_pool_categories.forEach(link => {
          const catId = link.product_categories.id;
          if (grouped[catId]) {
            grouped[catId].products.push(product);
          }
        });
      }
    });

    setGroupedTenantProducts(grouped);
  };

  const availablePoolProducts = poolProducts.filter(
    (poolProduct) =>
      !tenantProducts.some((tp) => tp.product_pool_id === poolProduct.id) &&
      (filterCategory === "all" || poolProduct.product_pool_categories?.some(
        (link) => link.product_categories.slug === filterCategory
      ))
  );

  const handleSelectProduct = (product: PoolProduct) => {
    setSelectedPoolProduct(product);
    setProductForm({
      base_price: "",
      quantity: "",
    });
    setDialogOpen(true);
  };

  const handleAddProduct = async () => {
    if (!selectedPoolProduct || !productForm.base_price) {
      toast({
        title: "Validation Error",
        description: "Price is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("products").insert({
        tenant_id: tenantId,
        product_pool_id: selectedPoolProduct.id,
        name: selectedPoolProduct.name,
        description: selectedPoolProduct.description,
        base_price: parseFloat(productForm.base_price),
        quantity: productForm.quantity ? parseInt(productForm.quantity) : null,
        unit: "each",
        image_url: selectedPoolProduct.image_url,
        active: true,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product added to your menu",
      });

      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditProduct = (product: TenantProduct) => {
    setEditingProduct(product);
    setProductForm({
      base_price: product.base_price.toString(),
      quantity: product.quantity?.toString() || "",
    });
    setEditDialogOpen(true);
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct || !productForm.base_price) {
      toast({
        title: "Validation Error",
        description: "Price is required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("products")
        .update({
          base_price: parseFloat(productForm.base_price),
          quantity: productForm.quantity ? parseInt(productForm.quantity) : null,
        })
        .eq("id", editingProduct.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product updated successfully",
      });

      setEditDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRemoveProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to remove this product from your menu? This will not affect past orders.")) {
      return;
    }

    try {
      // Delete the product - tenant_id is automatically checked by RLS
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId)
        .eq("tenant_id", tenantId);

      if (error) {
        console.error("Delete error:", error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Product removed from your menu",
      });

      fetchData();
    } catch (error: any) {
      console.error("Full error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete product. It may be referenced in past orders.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Coffee className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* My Products */}
      <Card>
        <CardHeader>
          <CardTitle>My Menu Products</CardTitle>
          <p className="text-sm text-muted-foreground">
            Products you've added to your menu with pricing
          </p>
        </CardHeader>
        <CardContent>
          {tenantProducts.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground mb-4">
                No products in your menu yet
              </p>
              <p className="text-sm text-muted-foreground">
                Add products from the pool below to get started
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tenantProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Coffee className="w-16 h-16 text-primary/40" />
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold">{product.name}</h3>
                      {product.pool_product && (
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${serveTimeColors[product.pool_product.serve_time]}`}>
                          {serveTimeLabels[product.pool_product.serve_time]}
                        </span>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-primary mb-3">
                      ${product.base_price.toFixed(2)}
                    </p>
                    {product.quantity && (
                      <p className="text-sm text-muted-foreground mb-3">
                        Quantity: {product.quantity}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleEditProduct(product)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveProduct(product.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Products from Pool */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Add Products from Pool</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Select products to add to your menu
              </p>
            </div>
            <Select
              value={filterCategory}
              onValueChange={setFilterCategory}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.slug}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {availablePoolProducts.length === 0 ? (
            <div className="text-center py-12">
              <Coffee className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">
                {filterCategory !== "all"
                  ? "No products available in this category"
                  : "All available products have been added to your menu"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {availablePoolProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden">
                  <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Coffee className="w-16 h-16 text-primary/40" />
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-sm">{product.name}</h3>
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${serveTimeColors[product.serve_time]}`}>
                        {serveTimeLabels[product.serve_time]}
                      </span>
                    </div>
                    {product.description && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleSelectProduct(product)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add to Menu
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product to Menu</DialogTitle>
            <DialogDescription>
              Set the price and quantity for {selectedPoolProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="price">Price *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={productForm.base_price}
                  onChange={(e) =>
                    setProductForm({ ...productForm, base_price: e.target.value })
                  }
                  className="pl-7"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="quantity">Quantity (Optional)</Label>
              <Input
                id="quantity"
                type="number"
                min="0"
                placeholder="Leave empty for unlimited"
                value={productForm.quantity}
                onChange={(e) =>
                  setProductForm({ ...productForm, quantity: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Set a quantity limit or leave empty for unlimited availability
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddProduct}>Add Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the price and quantity for {editingProduct?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-price">Price *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={productForm.base_price}
                  onChange={(e) =>
                    setProductForm({ ...productForm, base_price: e.target.value })
                  }
                  className="pl-7"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-quantity">Quantity (Optional)</Label>
              <Input
                id="edit-quantity"
                type="number"
                min="0"
                placeholder="Leave empty for unlimited"
                value={productForm.quantity}
                onChange={(e) =>
                  setProductForm({ ...productForm, quantity: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProduct}>Update Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
