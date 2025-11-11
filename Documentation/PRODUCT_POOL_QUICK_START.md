# Product Pool - Quick Start Guide

## For Admins: Create Product Pool

### Step 1: Apply Database Migration

In **Supabase SQL Editor**, run:
```sql
-- Copy and paste contents from:
supabase/migrations/20251109_create_product_pool.sql
```

### Step 2: Create Products

1. Go to **Admin Dashboard** (`/admin`)
2. Click **"Product Pool" tab**
3. Click **"Add Product"**
4. Fill in:
   - Name: "Cappuccino"
   - Category: "Breakfast"
   - Description: "Classic espresso with milk"
   - Image URL: (optional)
5. Click **"Create Product"**

### Step 3: Add More Products

Repeat for your menu items across all categories:
- 🌅 Breakfast: Morning coffee, pastries
- 🥐 Brunch: Late morning items
- 🍽️ Lunch: Midday meals
- ☕ Afternoon: Afternoon snacks
- 🌙 Dinner: Evening items

## For Tenants: Add Products to Menu

### Step 1: Browse Product Pool

1. Go to **Tenant Dashboard** (`/tenant`)
2. Click **"Products" tab**
3. Scroll to **"Add Products from Pool"**

### Step 2: Add Product

1. Find a product (e.g., Cappuccino)
2. Click **"Add to Menu"**
3. Set **Price**: $4.50
4. Set **Quantity**: Leave empty for unlimited
5. Click **"Add Product"**

### Step 3: Edit Pricing

1. Find product in **"My Menu Products"**
2. Click **"Edit"**
3. Update price or quantity
4. Click **"Update Product"**

## Quick Reference

### Admin Features
- ✅ Create master products
- ✅ Search & filter by category
- ✅ Edit/delete products
- ✅ View usage stats

### Tenant Features
- ✅ Select from product pool
- ✅ Set custom pricing
- ✅ Manage inventory
- ✅ Filter by category

### Product Categories

| Icon | Category | When to Use |
|------|----------|-------------|
| 🌅 | Breakfast | Coffee, pastries, morning items |
| 🥐 | Brunch | Late morning items |
| 🍽️ | Lunch | Sandwiches, salads, midday meals |
| ☕ | Afternoon | Afternoon coffee, snacks |
| 🌙 | Dinner | Evening items |

## Example Workflow

```
ADMIN:
1. Creates "Cappuccino" in pool (Breakfast category)
2. Adds image and description

TENANT A (Downtown):
1. Selects "Cappuccino" from pool
2. Sets price: $4.00
3. Leaves quantity unlimited
4. Product appears in their POS

TENANT B (Airport):
1. Selects same "Cappuccino"
2. Sets price: $6.50 (higher)
3. Sets quantity: 100
4. Product appears in their POS with different price
```

## File Locations

- **Migration**: [supabase/migrations/20251109_create_product_pool.sql](supabase/migrations/20251109_create_product_pool.sql)
- **Admin Component**: [src/components/ProductPoolManagement.tsx](src/components/ProductPoolManagement.tsx)
- **Tenant Component**: [src/components/TenantProductSelection.tsx](src/components/TenantProductSelection.tsx)
- **Full Documentation**: [PRODUCT_POOL_SYSTEM.md](PRODUCT_POOL_SYSTEM.md)

## Common Tasks

### Create Sample Products (SQL)

```sql
INSERT INTO product_pool (name, description, category) VALUES
('Cappuccino', 'Classic espresso with steamed milk', 'breakfast'),
('Latte', 'Espresso with more milk', 'breakfast'),
('Croissant', 'Buttery French pastry', 'brunch'),
('Caesar Salad', 'Fresh salad with parmesan', 'lunch'),
('Cookies', 'Chocolate chip cookies', 'afternoon');
```

### Check What Tenants Use a Product

```sql
SELECT
  t.name as tenant_name,
  p.base_price,
  p.quantity
FROM products p
JOIN tenants t ON p.tenant_id = t.id
WHERE p.product_pool_id = 'product-pool-id-here';
```

### Find Products Not in Any Menu

```sql
SELECT pp.*
FROM product_pool pp
LEFT JOIN products p ON p.product_pool_id = pp.id
WHERE p.id IS NULL;
```

---

**Ready to go!** Your Product Pool system is fully set up. 🚀
