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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Tag } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function CategoryManagement() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    sort_order: "",
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .order("sort_order");

      if (error) throw error;
      setCategories(data || []);
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

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name),
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.slug) {
      toast({
        title: "Validation Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingCategory) {
        // Update
        const { error } = await supabase
          .from("product_categories")
          .update({
            name: formData.name,
            slug: formData.slug,
            description: formData.description || null,
            sort_order: formData.sort_order ? parseInt(formData.sort_order) : 0,
          })
          .eq("id", editingCategory.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Category updated successfully",
        });
      } else {
        // Create
        const { error } = await supabase.from("product_categories").insert({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          sort_order: formData.sort_order ? parseInt(formData.sort_order) : 0,
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Category created successfully",
        });
      }

      // Reset and close
      setFormData({ name: "", slug: "", description: "", sort_order: "" });
      setEditingCategory(null);
      setDialogOpen(false);
      fetchCategories();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || "",
      sort_order: category.sort_order.toString(),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete the category "${category.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("product_categories")
        .delete()
        .eq("id", category.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Category deleted successfully",
      });

      fetchCategories();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setEditingCategory(null);
      setFormData({ name: "", slug: "", description: "", sort_order: "" });
    }
    setDialogOpen(open);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-muted-foreground">Loading categories...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Category Management
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage product categories
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit Category" : "Create New Category"}
              </DialogTitle>
              <DialogDescription>
                {editingCategory
                  ? "Update category information"
                  : "Add a new product category"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category-name">Category Name *</Label>
                <Input
                  id="category-name"
                  placeholder="e.g., Hot Drinks"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="category-slug">Slug</Label>
                <Input
                  id="category-slug"
                  placeholder="hot-drinks"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Auto-generated from name, but can be customized
                </p>
              </div>
              <div>
                <Label htmlFor="category-description">Description</Label>
                <Textarea
                  id="category-description"
                  placeholder="Optional description..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="category-sort-order">Sort Order</Label>
                <Input
                  id="category-sort-order"
                  type="number"
                  placeholder="0"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({ ...formData, sort_order: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lower numbers appear first
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleDialogClose(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingCategory ? "Update Category" : "Create Category"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="w-16 h-16 mx-auto text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground mb-2">No categories yet</p>
            <p className="text-sm text-muted-foreground">
              Add categories to organize your products
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="w-20">{category.sort_order}</TableCell>
                  <TableCell className="font-medium">{category.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {category.slug}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {category.description || "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(category)}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(category)}
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
    </Card>
  );
}
