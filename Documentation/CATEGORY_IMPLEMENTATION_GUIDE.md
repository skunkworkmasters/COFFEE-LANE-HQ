# Product Categories Implementation Guide

## Completed Work

### 1. Database Migration ✅
- **File**: `supabase/migrations/20251109_add_product_categories.sql`
- Created `product_categories` table with 18 default categories
- Created `product_pool_categories` junction table (many-to-many relationship)
- Added RLS policies for both tables
- Added indexes for performance

### 2. TypeScript Types ✅
- **File**: `src/integrations/supabase/types.ts`
- Added `product_categories` table types
- Added `product_pool_categories` table types

### 3. Category Management UI ✅
- **File**: `src/components/CategoryManagement.tsx`
- Full CRUD operations for categories
- Admin can create custom categories
- Auto-generates slugs from names
- Sort order management
- Integrated into Admin Dashboard as new "Categories" tab

## Remaining Work

### 4. Update ProductPoolManagement Component

**Location**: `src/components/ProductPoolManagement.tsx`

**Changes Needed**:

#### A. Add Category Multi-Select to Product Form
```typescript
// Add state for selected categories
const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
const [categories, setCategories] = useState<Category[]>([]);

// Fetch categories
useEffect(() => {
  fetchCategories();
}, []);

const fetchCategories = async () => {
  const { data } = await supabase
    .from("product_categories")
    .select("*")
    .order("sort_order");
  setCategories(data || []);
};

// In the product creation form, add multi-select for categories
<div>
  <Label>Categories *</Label>
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
        <label htmlFor={`category-${category.id}`} className="text-sm">
          {category.name}
        </label>
      </div>
    ))}
  </div>
</div>

// When creating/updating product, save categories
const handleCreateProduct = async () => {
  // ... existing product creation code ...

  // After product is created
  if (productId && selectedCategories.length > 0) {
    const categoryLinks = selectedCategories.map(categoryId => ({
      product_pool_id: productId,
      category_id: categoryId,
    }));

    await supabase
      .from("product_pool_categories")
      .insert(categoryLinks);
  }
};
```

#### B. Add Search, Filter, and Sort
```typescript
const [searchTerm, setSearchTerm] = useState("");
const [filterCategory, setFilterCategory] = useState<string>("all");
const [sortBy, setSortBy] = useState<"name" | "created_at">("name");
const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

// Add search bar before product table
<div className="flex gap-4 mb-4">
  <div className="flex-1">
    <Input
      placeholder="Search products..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="w-full"
    />
  </div>
  <Select value={filterCategory} onValueChange={setFilterCategory}>
    <SelectTrigger className="w-[200px]">
      <SelectValue placeholder="Filter by category" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All Categories</SelectItem>
      {categories.map((cat) => (
        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>
  <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
    <SelectTrigger className="w-[150px]">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="name">Sort by Name</SelectItem>
      <SelectItem value="created_at">Sort by Date</SelectItem>
    </SelectContent>
  </Select>
  <Button
    variant="outline"
    size="icon"
    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
  >
    {sortOrder === "asc" ? <ArrowUp /> : <ArrowDown />}
  </Button>
</div>
```

#### C. Organize Products by Category with Collapsible Sections
```typescript
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight } from "lucide-react";

// Fetch products with their categories
const fetchProductsWithCategories = async () => {
  const { data: productsData } = await supabase
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

  // Group products by category
  const grouped = {};
  categories.forEach(cat => {
    grouped[cat.id] = {
      category: cat,
      products: [],
      isOpen: true, // Track collapse state
    };
  });

  // Add "Uncategorized" for products without categories
  grouped["uncategorized"] = {
    category: { id: "uncategorized", name: "Uncategorized", sort_order: 999 },
    products: [],
    isOpen: true,
  };

  productsData.forEach(product => {
    if (product.product_pool_categories.length === 0) {
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

  return grouped;
};

// Render collapsible category sections
{Object.values(groupedProducts).map(({ category, products, isOpen }) => (
  <Collapsible
    key={category.id}
    open={isOpen}
    onOpenChange={(open) => toggleCategory(category.id, open)}
  >
    <Card className="mb-4">
      <CollapsibleTrigger asChild>
        <CardHeader className="cursor-pointer hover:bg-muted/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              <CardTitle>{category.name}</CardTitle>
              <span className="text-sm text-muted-foreground">
                ({products.length} products)
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={(e) => {
              e.stopPropagation();
              // Add product to this category
            }}>
              <Plus className="w-4 h-4 mr-1" />
              Add Product
            </Button>
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
              {/* Product table rows */}
            </Table>
          )}
        </CardContent>
      </CollapsibleContent>
    </Card>
  </Collapsible>
))}
```

### 5. Update TenantProductSelection Component

**Location**: `src/components/TenantProductSelection.tsx`

**Changes Needed**: Similar to ProductPoolManagement but with these differences:

1. **Two Tables**: "My Menu Products" and "Available Products from Pool"
2. Both tables need:
   - Search functionality
   - Category filter
   - Sort by name/date
   - Collapsible category sections

3. **My Menu Products**:
   - Shows products already added to tenant's menu
   - Organized by category
   - Each category collapsible
   - Shows product details, pricing, portions

4. **Available Products from Pool**:
   - Shows products not yet added
   - Filter by category
   - Search by name
   - "Add to Menu" button for each product
   - When added, moves to "My Menu Products" under appropriate category

### 6. Import Required Components

Make sure to add Checkbox import:
```typescript
import { Checkbox } from "@/components/ui/checkbox";
```

And Collapsible components are in shadcn/ui, may need to add if not present.

## Testing Checklist

1. **Database**:
   - [ ] Run migration in Supabase SQL Editor
   - [ ] Verify 18 default categories exist
   - [ ] Test RLS policies work correctly

2. **Admin Dashboard**:
   - [ ] Categories tab visible
   - [ ] Can create new category
   - [ ] Can edit existing category
   - [ ] Can delete category (with warning)
   - [ ] Auto-slug generation works

3. **Product Pool**:
   - [ ] Can select multiple categories when creating product
   - [ ] At least one category required
   - [ ] Search works across product names
   - [ ] Filter by category works
   - [ ] Sort by name/date works
   - [ ] Products grouped by category
   - [ ] Categories collapsible/expandable
   - [ ] Product appears in all selected categories

4. **Tenant Product Selection**:
   - [ ] Both tables have search/filter/sort
   - [ ] Categories collapsible in both tables
   - [ ] Can add product from pool
   - [ ] Product moves to correct category in "My Menu"
   - [ ] Can remove product from menu

## Key Implementation Notes

1. **Many-to-Many Relationship**: Products can have multiple categories
2. **Category Validation**: At least one category required when creating product
3. **Uncategorized Handling**: Products without categories shown in "Uncategorized" section
4. **Performance**: Use indexes on category_id and product_pool_id for fast lookups
5. **User Experience**: Collapse all/expand all button would be helpful
6. **Search**: Should search across product name, description if you add that field
7. **Filter**: Can filter by single category or "All Categories"
8. **Sort State**: Remember user's sort preferences per session

## SQL Migration Command

Run this in Supabase SQL Editor:
```sql
-- From file: supabase/migrations/20251109_add_product_categories.sql
-- Copy and paste the entire migration file
```

## API Calls Reference

### Fetch Products with Categories
```typescript
const { data } = await supabase
  .from("product_pool")
  .select(`
    *,
    product_pool_categories (
      product_categories (*)
    )
  `);
```

### Add Categories to Product
```typescript
await supabase
  .from("product_pool_categories")
  .insert(
    categoryIds.map(catId => ({
      product_pool_id: productId,
      category_id: catId,
    }))
  );
```

### Update Product Categories
```typescript
// Delete existing
await supabase
  .from("product_pool_categories")
  .delete()
  .eq("product_pool_id", productId);

// Insert new
await supabase
  .from("product_pool_categories")
  .insert(newCategoryLinks);
```

## Next Steps

1. Run the database migration
2. Test category management in Admin Dashboard
3. Update ProductPoolManagement component with all features
4. Update TenantProductSelection component with all features
5. Test end-to-end workflow
6. Add any missing UI polish (loading states, empty states, etc.)
