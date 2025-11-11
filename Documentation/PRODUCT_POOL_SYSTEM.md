# Product Pool System - Complete Guide

## Overview

The Product Pool System allows **admins** to create a centralized catalog of products that **tenants** can select from and customize with their own pricing and inventory.

### How It Works

```
Admin → Creates Product Pool (master catalog)
  ↓
Tenant → Selects products from pool
  ↓
Tenant → Sets price & quantity for each product
  ↓
Products appear in POS system
```

## Features

### For Admins

✅ **Create master product catalog** (Product Pool)
✅ **Manage products** with images, descriptions, and categories
✅ **Search and filter** products by category
✅ **Sort products** by name, category, or date created
✅ **Edit or delete** pool products
✅ **View usage stats** (how many tenants use each product)

### For Tenants

✅ **Browse product pool** by category
✅ **Add products to menu** with custom pricing
✅ **Set quantity limits** (or unlimited)
✅ **Edit pricing and quantity** anytime
✅ **Remove products** from menu
✅ **Visual product cards** with images

## Product Categories

The system supports 5 meal period categories:

| Category | Color | Description |
|----------|-------|-------------|
| 🌅 Breakfast | Yellow | Morning items (coffee, pastries, etc.) |
| 🥐 Brunch | Orange | Late morning items |
| 🍽️ Lunch | Green | Midday meals |
| ☕ Afternoon | Blue | Afternoon snacks and beverages |
| 🌙 Dinner | Purple | Evening items |

## Database Schema

### `product_pool` Table (Master Catalog)

```sql
CREATE TABLE product_pool (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category product_category NOT NULL,  -- breakfast, brunch, lunch, afternoon, dinner
  image_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### `products` Table (Tenant-Specific)

**Updated with new columns:**

```sql
ALTER TABLE products
ADD COLUMN product_pool_id UUID REFERENCES product_pool(id),
ADD COLUMN quantity INTEGER DEFAULT NULL;  -- NULL = unlimited
```

**Complete structure:**
- `product_pool_id`: References the master product
- `tenant_id`: Which coffee shop owns this
- `base_price`: Tenant's custom price
- `quantity`: Optional inventory limit (NULL = unlimited)
- `active`: Whether product is currently available
- `image_url`: Inherited from pool or custom
- `name`: Inherited from pool product

## Admin Workflow

### 1. Access Product Pool Management

1. Log in as **Admin**
2. Navigate to **Admin Dashboard** (`/admin`)
3. Click **"Product Pool" tab**

### 2. Create a Product

1. Click **"Add Product"** button
2. Fill in the form:
   - **Product Name** * (required): e.g., "Cappuccino"
   - **Category** * (required): Select meal period
   - **Description**: Optional details
   - **Image URL**: Link to product image
3. Click **"Create Product"**

**Example:**
```
Name: Cappuccino
Category: Breakfast
Description: Classic Italian espresso with steamed milk
Image URL: https://example.com/cappuccino.jpg
```

### 3. Edit a Product

1. Find the product in the table
2. Click **"Edit" button** (pencil icon)
3. Update details
4. Click **"Update Product"**

### 4. Delete a Product

1. Click **"Delete" button** (trash icon)
2. Confirm deletion
3. **Note**: This removes the product from ALL tenant menus

### 5. Search and Filter

**Search:**
- Type in the search box to find products by name or description

**Filter by Category:**
- Use dropdown to show only specific meal periods

**Sort:**
- Name (A-Z)
- Category
- Newest First

### 6. View Usage Stats

The table shows:
- **Tenant count**: How many coffee shops use this product
- **Products using count**: Total instances across all tenants

## Tenant Workflow

### 1. Access Product Selection

1. Log in as **Tenant** (or Admin viewing tenant)
2. Navigate to **Tenant Dashboard** (`/tenant`)
3. Click **"Products" tab**

### 2. Browse Available Products

**Two sections:**
1. **My Menu Products**: Products you've already added
2. **Add Products from Pool**: Available products to add

**Filter by category:**
- Use dropdown to filter by meal period

### 3. Add Product to Menu

1. Find a product in "Add Products from Pool"
2. Click **"Add to Menu"** button
3. In the dialog:
   - **Price** * (required): Set your price (e.g., $4.50)
   - **Quantity**: Optional inventory limit
     - Leave empty for unlimited
     - Set a number to limit availability
4. Click **"Add Product"**

**Example:**
```
Product: Cappuccino (from pool)
Your Price: $4.50
Quantity: (empty for unlimited)
```

### 4. Edit Product Pricing

1. Find the product in "My Menu Products"
2. Click **"Edit"** button
3. Update:
   - **Price**: Change your custom price
   - **Quantity**: Update inventory limit
4. Click **"Update Product"**

**Use Cases:**
- **Price changes**: Adjust for seasonal pricing
- **Happy hour**: Lower afternoon prices
- **Limited stock**: Set quantity when ingredient is low

### 5. Remove Product from Menu

1. Find the product in "My Menu Products"
2. Click **"Delete" button** (trash icon)
3. Confirm removal

**Note**: This only removes it from YOUR menu, not from the pool

## Use Case Examples

### Example 1: Coffee Shop Chain

**Admin creates master catalog:**
- Cappuccino
- Latte
- Espresso
- Croissant
- Muffin

**Downtown Location (Tenant 1):**
- Cappuccino: $4.50
- Latte: $5.00
- Croissant: $3.50

**Airport Location (Tenant 2):**
- Cappuccino: $6.50 (higher price)
- Latte: $7.00
- Espresso: $4.00

### Example 2: Seasonal Menu

**Admin adds to pool:**
- Pumpkin Spice Latte (Afternoon category)

**Tenant actions:**
- Adds to menu in Fall: $5.50
- Removes from menu in Spring

### Example 3: Limited Availability

**Tenant workflow:**
- Selects "Blueberry Muffin" from pool
- Sets price: $3.50
- Sets quantity: 12
- When sold out, quantity goes to 0
- Tenant updates quantity each morning

### Example 4: Price Testing

**Tenant A:**
- Cappuccino: $4.00 (budget pricing)

**Tenant B:**
- Cappuccino: $6.00 (premium pricing)

Both use the same pool product but compete with different pricing strategies.

## Key Features Explained

### 1. Search Functionality

Located in Admin Product Pool Management:
- **Real-time search**: Filters as you type
- **Searches**: Product name and description
- **Case-insensitive**: Finds "cappuccino" or "Cappuccino"

### 2. Category Filtering

Available in both Admin and Tenant views:
- **All Categories**: Show everything
- **Breakfast, Brunch, Lunch, Afternoon, Dinner**: Filter to meal period

### 3. Sorting

Admin Product Pool table supports:
- **Name (A-Z)**: Alphabetical order
- **Category**: Groups by meal period
- **Newest First**: Most recently added products

### 4. Product Images

**Admin:**
- Provides image URL when creating product
- Images are inherited by tenant products

**Tenants:**
- Automatically use pool product images
- Visual product cards with images

**Fallback:**
- Coffee icon displayed if no image provided

### 5. Quantity Management

**Unlimited (default):**
- Leave quantity empty
- Product always available in POS

**Limited:**
- Set specific quantity (e.g., 50)
- POS can track inventory
- Update quantity as needed

## Security & Permissions

### RLS Policies

**product_pool table:**
```sql
-- Admins can manage everything
"Admins can manage product pool"
  FOR ALL USING (has_role(auth.uid(), 'admin'))

-- Tenants can view the pool (to select from)
"Tenants can view product pool"
  FOR SELECT USING (has_role(auth.uid(), 'tenant') OR has_role(auth.uid(), 'admin'))
```

**products table:**
- Admins can view/edit all tenant products
- Tenants can only manage their own products
- Products are filtered by `tenant_id`

## Migration Instructions

### 1. Apply the Migration

Run in Supabase SQL Editor:

```bash
# Apply the migration
supabase/migrations/20251109_create_product_pool.sql
```

This creates:
- `product_category` enum
- `product_pool` table
- `product_pool_stats` view
- Adds `product_pool_id` and `quantity` to `products` table
- Sets up RLS policies

### 2. Verify Migration

```sql
-- Check enum exists
SELECT enumlabel FROM pg_enum
WHERE enumtypid = 'public.product_category'::regtype;

-- Should return: breakfast, brunch, lunch, afternoon, dinner

-- Check product_pool table
SELECT * FROM product_pool;

-- Check view
SELECT * FROM product_pool_stats;
```

### 3. Create Sample Products (Optional)

```sql
-- Admin creates sample products
INSERT INTO product_pool (name, description, category, image_url) VALUES
('Cappuccino', 'Classic Italian espresso with steamed milk', 'breakfast', null),
('Latte', 'Espresso with more steamed milk', 'breakfast', null),
('Croissant', 'Buttery French pastry', 'brunch', null),
('Caesar Salad', 'Fresh romaine with parmesan and croutons', 'lunch', null),
('Cookies', 'Freshly baked chocolate chip cookies', 'afternoon', null),
('Soup of the Day', 'Chef''s daily soup selection', 'dinner', null);
```

## Technical Details

### File Locations

**Migration:**
- [supabase/migrations/20251109_create_product_pool.sql](supabase/migrations/20251109_create_product_pool.sql)

**Admin Component:**
- [src/components/ProductPoolManagement.tsx](src/components/ProductPoolManagement.tsx)

**Tenant Component:**
- [src/components/TenantProductSelection.tsx](src/components/TenantProductSelection.tsx)

**Admin Dashboard:**
- [src/pages/AdminDashboard.tsx](src/pages/AdminDashboard.tsx) - Added "Product Pool" tab

**Tenant Dashboard:**
- [src/pages/TenantDashboard.tsx](src/pages/TenantDashboard.tsx) - Updated "Products" tab

### API Calls

**Admin - Fetch Product Pool:**
```javascript
supabase.from("product_pool_stats").select("*")
```

**Admin - Create Product:**
```javascript
supabase.from("product_pool").insert({
  name, description, category, image_url
})
```

**Tenant - Fetch Pool Products:**
```javascript
supabase.from("product_pool").select("*")
```

**Tenant - Add to Menu:**
```javascript
supabase.from("products").insert({
  tenant_id, product_pool_id, name, base_price, quantity, ...
})
```

**Tenant - Update Pricing:**
```javascript
supabase.from("products")
  .update({ base_price, quantity })
  .eq("id", productId)
```

## Troubleshooting

### Issue: Can't see Product Pool tab in Admin Dashboard

**Cause**: Not logged in as admin

**Solution**: Verify admin role with:
```sql
SELECT role FROM user_roles WHERE user_id = auth.uid();
```

### Issue: Tenant can't see any pool products

**Cause**: RLS policies or no products in pool

**Solution**:
1. Check if products exist: `SELECT * FROM product_pool;`
2. Verify tenant can read: `SELECT * FROM product_pool;` (as tenant user)

### Issue: Product images not showing

**Cause**: Invalid image URL or CORS issue

**Solution**:
- Verify image URL is publicly accessible
- Use image hosting services (Cloudinary, Imgur, etc.)
- Or leave empty to use coffee icon fallback

### Issue: Can't add product to menu (error)

**Cause**: Missing price or permission issue

**Solution**:
1. Ensure price is set
2. Verify tenant_id is correct
3. Check RLS policies on products table

### Issue: Products not appearing in POS

**Cause**: Products must have `active = true` and match tenant

**Solution**:
```sql
-- Check active products for tenant
SELECT * FROM products
WHERE tenant_id = 'your-tenant-id' AND active = true;
```

## Best Practices

### For Admins

1. **Use clear names**: "Cappuccino" not "Cap" or "Capp"
2. **Write descriptions**: Help tenants understand the product
3. **Categorize correctly**: Breakfast for morning, etc.
4. **Use high-quality images**: At least 500x500px
5. **Don't delete actively used products**: Check tenant count first

### For Tenants

1. **Set competitive prices**: Research local market
2. **Use quantity limits wisely**: For perishables or limited items
3. **Update regularly**: Adjust prices and availability
4. **Remove unavailable items**: Don't keep out-of-stock products
5. **Review pool periodically**: New products may be added

## Future Enhancements

Potential features to add:

- [ ] Bulk import products (CSV)
- [ ] Product variants (sizes, modifications)
- [ ] Nutritional information
- [ ] Allergen tags
- [ ] Supplier information
- [ ] Cost tracking (for profit margins)
- [ ] Seasonal availability flags
- [ ] Multi-language support
- [ ] Product reviews/ratings
- [ ] Inventory auto-decrement in POS

## Summary

The Product Pool System creates a **centralized product management** solution:

- **Admins** maintain ONE master catalog
- **Tenants** customize pricing per location
- **Consistency** across the platform
- **Flexibility** for individual shops
- **Easy updates** when products change

This system scales efficiently as you add more coffee shops to the platform while maintaining brand consistency.

---

**You're all set!** The Product Pool system is fully functional and ready to use. 🎉
