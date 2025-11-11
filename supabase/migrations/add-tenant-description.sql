-- Add description column to tenants table
-- This column was missing from the original schema but is used in the admin UI

ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.tenants.description IS
  'Optional description of the tenant/coffee shop';
