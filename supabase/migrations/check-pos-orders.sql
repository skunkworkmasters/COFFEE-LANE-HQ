-- Diagnostic SQL to check POS orders issue
-- Run this in Supabase SQL Editor

-- 1. Check if RLS is enabled on orders
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'orders';

-- 2. Check orders table policies
SELECT
  policyname,
  tablename,
  cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'orders';

-- 3. Check if any orders exist (bypass RLS as admin)
SELECT
  count(*) as total_orders
FROM public.orders;

-- 4. Check recent orders with tenant info
SELECT
  o.id,
  o.order_number,
  o.tenant_id,
  o.total,
  o.status,
  o.created_at,
  t.name as tenant_name
FROM public.orders o
LEFT JOIN public.tenants t ON t.id = o.tenant_id
ORDER BY o.created_at DESC
LIMIT 10;

-- 5. Check today's orders
SELECT
  count(*) as todays_orders
FROM public.orders
WHERE created_at >= CURRENT_DATE;

-- 6. Test the get_user_tenant_id function for current user
SELECT
  auth.uid() as current_user_id,
  public.get_user_tenant_id(auth.uid()) as my_tenant_id;

-- 7. Check current user's role
SELECT
  role,
  tenant_id
FROM public.user_roles
WHERE user_id = auth.uid();
