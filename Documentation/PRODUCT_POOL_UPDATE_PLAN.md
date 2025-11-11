# ProductPoolManagement Update Plan

## Changes Required

### 1. Rename "category" field to "serve_time"
- Update interface: `category` → `serve_time`
- Update type: `ProductCategory` → `ServeTime`
- Keep all existing values (breakfast, brunch, lunch, afternoon, dinner, all day)
- Update all references in component

### 2. Add Categories (Multi-Select)
- Fetch categories from `product_categories` table
- Add `selectedCategories` state array
- Create checkbox UI for category selection
- **Validation**: Require at least ONE category selected
- Save to `product_pool_categories` junction table

### 3. Fetch Products with Categories
Update query to include categories:
```typescript
const { data } = await supabase
  .from("product_pool")
  .select(`
    *,
    product_pool_categories (
      category_id,
      product_categories (
        id,
        name,
        slug,
        sort_order
      )
    )
  `)
  .order("name");
```

### 4. Group Products by Category
```typescript
interface GroupedProducts {
  [categoryId: string]: {
    category: Category;
    products: PoolProduct[];
    isOpen: boolean;
  };
}
```

### 5. Collapsible Category Sections
Replace flat table with collapsible sections:
- One section per category
- Header shows category name + product count
- Click to expand/collapse
- Each section contains table of products in that category
- Product can appear in multiple sections if it has multiple categories

### 6. "Uncategorized" Handling
- Products without categories go in "Uncategorized" section
- Show at bottom with warning styling

## Implementation Steps

1. Update types and interfaces
2. Add category state and fetch logic
3. Update product creation/edit form
4. Update product fetch to include categories
5. Implement grouping logic
6. Replace table with collapsible sections
7. Update save/update handlers

## Code Changes

### Types
```typescript
type ServeTime = "breakfast" | "brunch" | "lunch" | "afternoon" | "dinner" | "all day";

interface Category {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
}

interface PoolProduct {
  id: string;
  name: string;
  description: string | null;
  serve_time: ServeTime;  // RENAMED from category
  image_url: string | null;
  created_at: string;
  product_pool_categories?: Array<{
    category_id: string;
    product_categories: Category;
  }>;
}
```

### State Additions
```typescript
const [categories, setCategories] = useState<Category[]>([]);
const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
const [groupedProducts, setGroupedProducts] = useState<GroupedProducts>({});
const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
```

### Form Section - Category Multi-Select
```tsx
<div className="col-span-2">
  <Label>Product Categories * (Select at least one)</Label>
  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border rounded-md p-3">
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
        <label htmlFor={`category-${category.id}`} className="text-sm cursor-pointer">
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
</div>
```

### Form Section - Serve Time
```tsx
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
```

### Save Handler Update
```typescript
const handleSave = async () => {
  // Validation
  if (selectedCategories.length === 0) {
    toast({
      title: "Validation Error",
      description: "Please select at least one category",
      variant: "destructive",
    });
    return;
  }

  // ... existing image upload logic ...

  // Create/Update product
  const productData = {
    name: formData.name,
    description: formData.description || null,
    serve_time: formData.serve_time,  // RENAMED
    image_url: finalImageUrl,
  };

  let productId;
  if (editingProduct) {
    await supabase
      .from("product_pool")
      .update(productData)
      .eq("id", editingProduct.id);
    productId = editingProduct.id;

    // Delete existing category links
    await supabase
      .from("product_pool_categories")
      .delete()
      .eq("product_pool_id", productId);
  } else {
    const { data } = await supabase
      .from("product_pool")
      .insert(productData)
      .select()
      .single();
    productId = data.id;
  }

  // Insert category links
  const categoryLinks = selectedCategories.map(categoryId => ({
    product_pool_id: productId,
    category_id: categoryId,
  }));

  await supabase
    .from("product_pool_categories")
    .insert(categoryLinks);

  // ... rest of handler ...
};
```

### Collapsible Sections Render
```tsx
<div className="space-y-4">
  {Object.entries(groupedProducts)
    .sort(([, a], [, b]) => a.category.sort_order - b.category.sort_order)
    .map(([categoryId, { category, products, isOpen }]) => (
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
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {collapsedCategories.has(categoryId) ? (
                    <ChevronRight className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                  <CardTitle>{category.name}</CardTitle>
                  <Badge variant="secondary">{products.length}</Badge>
                </div>
              </div>
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
                  {/* Product rows */}
                </Table>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    ))}
</div>
```

## Database Migration Needed?

**NO** - The product_pool table already exists. We're just:
1. Using existing `serve_time` column (or need to rename `category` → `serve_time` in DB)
2. Using new `product_categories` and `product_pool_categories` tables (already created)

**WAIT** - Check if product_pool has `category` column that needs renaming!

## Next: Check Database Schema
Need to verify product_pool schema and potentially create migration to rename column.
