-- ============================================================================
-- Check Orders Data - Diagnostic Queries
-- ============================================================================
-- Run these queries in Supabase SQL Editor to diagnose the orders issue
-- ============================================================================

-- Step 1: Check if there are any orders in the database
SELECT
  COUNT(*) as total_orders,
  tenant_id,
  t.name as tenant_name
FROM orders o
LEFT JOIN tenants t ON o.tenant_id = t.id
GROUP BY tenant_id, t.name
ORDER BY tenant_id;

-- Step 2: View all orders with details
SELECT
  o.id,
  o.order_number,
  o.tenant_id,
  t.name as tenant_name,
  o.staff_user_id,
  p.full_name as staff_name,
  p.email as staff_email,
  o.total,
  o.status,
  o.created_at
FROM orders o
LEFT JOIN tenants t ON o.tenant_id = t.id
LEFT JOIN profiles p ON o.staff_user_id = p.id
ORDER BY o.created_at DESC
LIMIT 20;

-- Step 3: Check order items
SELECT
  oi.id,
  oi.order_id,
  o.order_number,
  oi.product_name,
  oi.portion_name,
  oi.quantity,
  oi.unit_price,
  oi.total_price
FROM order_items oi
JOIN orders o ON oi.order_id = o.id
ORDER BY o.created_at DESC
LIMIT 20;

-- Step 4: Check current user's role and tenant
SELECT
  auth.uid() as current_user_id,
  ur.role,
  ur.tenant_id,
  t.name as tenant_name,
  p.email,
  p.full_name
FROM user_roles ur
LEFT JOIN tenants t ON ur.tenant_id = t.id
LEFT JOIN profiles p ON ur.user_id = p.id
WHERE ur.user_id = auth.uid();

-- Step 5: Check if admin role exists
SELECT
  public.has_role(auth.uid(), 'admin'::public.app_role) as is_admin;

-- Step 6: Test the RLS policy directly
-- This will show if the current user can see orders
SELECT
  o.id,
  o.order_number,
  o.tenant_id,
  o.total,
  o.created_at
FROM orders o
ORDER BY o.created_at DESC
LIMIT 10;

-- ============================================================================
-- Expected Results:
-- ============================================================================
-- If no orders show up in Step 6 but show up in Step 2, then RLS is blocking
-- If Step 5 shows is_admin = true, then admin policy should allow access
-- If Step 1 shows 0 orders, then no orders have been created yet
