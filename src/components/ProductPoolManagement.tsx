import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Search, Coffee, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

// UPDATE: PoolProduct interface
interface PoolProduct {
  id: string;
  name: string;
  description: string | null;
  serve_time: ServeTime;  // RENAMED from 'category'
  image_url: string | null;
  created_at: string;
  tenant_count?: number;
  products_using_count?: number;
  product_pool_categories?: Array<{
    category_id: string;
    product_categories: Category;
  }>;
}

// UPDATE: Rename all references
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

export function ProductPoolManagement() {
  const [products, setProducts] = useState<PoolProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<PoolProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "serve_time" | "created_at">("name");
  const { toast } = useToast();

  // Category state
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [groupedProducts, setGroupedProducts] = useState<GroupedProducts>({});
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");

  // Create/Edit dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<PoolProduct | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    serve_time: "breakfast" as ServeTime,  // RENAMED from category
    image_url: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, searchTerm, filterCategory, sortBy]);

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

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
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
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
      groupProductsByCategory(data || []);
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

  const groupProductsByCategory = (productsList: PoolProduct[]) => {
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

    setGroupedProducts(grouped);
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter (now filters by product_categories, not serve_time)
    if (filterCategory !== "all") {
      filtered = filtered.filter((p) =>
        p.product_pool_categories?.some(
          (link) => link.product_categories.slug === filterCategory
        )
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "serve_time":  // RENAMED from category
          return a.serve_time.localeCompare(b.serve_time);
        case "created_at":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

    setFilteredProducts(filtered);
    if (viewMode === "grouped") {
      groupProductsByCategory(filtered);
    }
  };

  const handleOpenDialog = (product?: PoolProduct) => {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        description: product.description || "",
        serve_time: product.serve_time,  // RENAMED
        image_url: product.image_url || "",
      });
      setImagePreview(product.image_url);

      // Load existing categories
      const existingCategories = product.product_pool_categories?.map(
        link => link.category_id
      ) || [];
      setSelectedCategories(existingCategories);
    } else {
      setEditingProduct(null);
      setFormData({
        name: "",
        description: "",
        serve_time: "breakfast",
        image_url: "",
      });
      setImagePreview(null);
      setSelectedCategories([]);
    }
    setImageFile(null);
    setDialogOpen(true);
  };

  const handleImageChange = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          title: "Invalid File",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Image must be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      setImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);

      // Create unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Product name is required",
        variant: "destructive",
      });
      return;
    }

    if (selectedCategories.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one category",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Handle image upload
      let finalImageUrl = formData.image_url;
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        }
      }

      // Prepare product data
      const productData = {
        name: formData.name,
        description: formData.description || null,
        serve_time: formData.serve_time,  // RENAMED from category
        image_url: finalImageUrl,
      };

      let productId: string;

      if (editingProduct) {
        // Update existing product
        const { error: updateError } = await supabase
          .from("product_pool")
          .update(productData)
          .eq("id", editingProduct.id);

        if (updateError) throw updateError;
        productId = editingProduct.id;

        // Delete existing category links
        const { error: deleteError } = await supabase
          .from("product_pool_categories")
          .delete()
          .eq("product_pool_id", productId);

        if (deleteError) throw deleteError;
      } else {
        // Create new product
        const { data: newProduct, error: insertError } = await supabase
          .from("product_pool")
          .insert(productData)
          .select()
          .single();

        if (insertError) throw insertError;
        if (!newProduct) throw new Error("Failed to create product");
        productId = newProduct.id;
      }

      // Insert category links
      const categoryLinks = selectedCategories.map(categoryId => ({
        product_pool_id: productId,
        category_id: categoryId,
      }));

      const { error: linksError } = await supabase
        .from("product_pool_categories")
        .insert(categoryLinks);

      if (linksError) throw linksError;

      toast({
        title: "Success",
        description: editingProduct
          ? "Product updated successfully"
          : "Product added to pool successfully",
      });

      setDialogOpen(false);
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (product: PoolProduct) => {
    if (
      !confirm(
        `Are you sure you want to delete "${product.name}"? This will remove it from ${product.products_using_count} tenant product(s).`
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("product_pool")
        .delete()
        .eq("id", product.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product deleted successfully",
      });

      fetchProducts();
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
        <Coffee className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Product Pool</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage the master product catalog that tenants can select from
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingProduct ? "Edit Product" : "Create New Product"}
                </DialogTitle>
                <DialogDescription>
                  {editingProduct
                    ? "Update product details in the pool"
                    : "Add a new product to the pool that tenants can use"}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Product Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Cappuccino"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="serve-time">Serve Time</Label>
                    <Select
                      value={formData.serve_time}
                      onValueChange={(value: ServeTime) =>
                        setFormData({ ...formData, serve_time: value })
                      }
                    >
                      <SelectTrigger id="serve-time">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="brunch">Brunch</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="afternoon">Afternoon</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                        <SelectItem value="all day">All Day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Product description..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div className="col-span-2">
                  <Label>Product Categories * (Select at least one)</Label>
                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border rounded-md p-3 mt-2">
                    {categories.map((category) => (
                      <div key={category.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`category-${category.id}`}
                          checked={selectedCategories.includes(category.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedCategories([...selectedCategories, category.id]);
                            } else {
                              setSelectedCategories(selectedCategories.filter(id => id !== category.id));
                            }
                          }}
                        />
                        <label
                          htmlFor={`category-${category.id}`}
                          className="text-sm cursor-pointer flex-1"
                        >
                          {category.name}
                        </label>
                      </div>
                    ))}
                  </div>
                  {selectedCategories.length === 0 && (
                    <p className="text-sm text-destructive mt-1">
                      Please select at least one category
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Products can belong to multiple categories
                  </p>
                </div>
                <div>
                  <Label htmlFor="image">Product Image</Label>
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload an image (JPEG, PNG, WebP, GIF - Max 5MB)
                  </p>
                  {imagePreview && (
                    <div className="mt-3">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded border"
                      />
                    </div>
                  )}
                  {uploading && (
                    <p className="text-sm text-primary mt-2">Uploading image...</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingProduct ? "Update Product" : "Create Product"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters and Search */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
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
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="serve_time">Serve Time</SelectItem>
              <SelectItem value="created_at">Newest First</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">
            {viewMode === "grouped" ? "Products by Category" : "All Products"}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "grouped" ? "flat" : "grouped")}
          >
            {viewMode === "grouped" ? "Show Flat List" : "Group by Category"}
          </Button>
        </div>

        {viewMode === "flat" ? (
          filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Coffee className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || filterCategory !== "all"
                  ? "No products match your filters"
                  : "No products in the pool yet"}
              </p>
              {!searchTerm && filterCategory === "all" && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => handleOpenDialog()}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Product
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Serve Time</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-12 h-12 rounded object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                              <Coffee className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{product.name}</p>
                            {product.description && (
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {product.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${serveTimeColors[product.serve_time]}`}>
                          {serveTimeLabels[product.serve_time]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{product.tenant_count || 0} tenants</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(product)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(product)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedProducts)
              .sort(([, a], [, b]) => a.category.sort_order - b.category.sort_order)
              .map(([categoryId, { category, products }]) => {
                if (products.length === 0 && categoryId !== "uncategorized") return null;

                return (
                  <Collapsible
                    key={categoryId}
                    open={!collapsedCategories.has(categoryId)}
                    onOpenChange={(open) => {
                      const newCollapsed = new Set(collapsedCategories);
                      if (open) {
                        newCollapsed.delete(categoryId);
                      } else {
                        newCollapsed.add(categoryId);
                      }
                      setCollapsedCategories(newCollapsed);
                    }}
                  >
                    <Card className={categoryId === "uncategorized" && products.length > 0 ? "border-orange-300" : ""}>
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {collapsedCategories.has(categoryId) ? (
                                <ChevronRight className="w-5 h-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-muted-foreground" />
                              )}
                              <CardTitle className="text-lg">{category.name}</CardTitle>
                              <Badge variant={products.length === 0 ? "secondary" : "default"}>
                                {products.length}
                              </Badge>
                            </div>
                            {categoryId === "uncategorized" && products.length > 0 && (
                              <Badge variant="destructive">Needs Categories</Badge>
                            )}
                          </div>
                          {category.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {category.description}
                            </p>
                          )}
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent>
                          {products.length === 0 ? (
                            <p className="text-center py-8 text-muted-foreground">
                              No products in this category
                            </p>
                          ) : (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Product</TableHead>
                                  <TableHead>Serve Time</TableHead>
                                  <TableHead>Usage</TableHead>
                                  <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {products.map((product) => (
                                  <TableRow key={product.id}>
                                    <TableCell>
                                      <div className="flex items-center gap-3">
                                        {product.image_url ? (
                                          <img
                                            src={product.image_url}
                                            alt={product.name}
                                            className="w-12 h-12 rounded object-cover"
                                          />
                                        ) : (
                                          <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                                            <Coffee className="w-6 h-6 text-muted-foreground" />
                                          </div>
                                        )}
                                        <div>
                                          <p className="font-medium">{product.name}</p>
                                          {product.description && (
                                            <p className="text-sm text-muted-foreground line-clamp-1">
                                              {product.description}
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${serveTimeColors[product.serve_time]}`}>
                                        {serveTimeLabels[product.serve_time]}
                                      </span>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-sm">
                                        <p>{product.tenant_count || 0} tenants</p>
                                        <p className="text-muted-foreground">
                                          {product.products_using_count || 0} instances
                                        </p>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <div className="flex justify-end gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleOpenDialog(product)}
                                        >
                                          <Edit className="w-4 h-4 mr-1" />
                                          Edit
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={() => handleDelete(product)}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          )}
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                );
              })}
          </div>
        )}

        <div className="mt-4 text-sm text-muted-foreground">
          Showing {filteredProducts.length} of {products.length} products
        </div>
      </CardContent>
    </Card>
  );
}
