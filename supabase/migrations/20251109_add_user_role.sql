-- ============================================================================
-- Add "user" Role for Staff Members
-- ============================================================================
-- This migration adds the 'user' role to the app_role enum for staff members
-- Date: 2025-11-09
-- ============================================================================

-- Step 1: Add 'user' to the app_role enum if it doesn't exist
DO $$
BEGIN
  -- Check if 'user' value exists in the enum
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.app_role'::regtype
    AND enumlabel = 'user'
  ) THEN
    -- Add the new enum value
    ALTER TYPE public.app_role ADD VALUE 'user';
    RAISE NOTICE 'Added "user" to app_role enum';
  ELSE
    RAISE NOTICE '"user" already exists in app_role enum';
  END IF;
END $$;

-- ============================================================================
-- Usage Notes:
-- ============================================================================
-- Role definitions:
-- - 'admin': Site administrators with full access to all tenants
-- - 'tenant': Tenant administrators who manage their coffee shop
-- - 'user': Staff members who operate the POS system
--
-- When administrators assign a user to a tenant:
-- - Set role = 'tenant' for tenant administrators (access to Tenant Dashboard)
-- - Set role = 'user' for staff members (access to POS only)
--
-- RLS policies already support this with has_role() function and tenant_id checks

-- ============================================================================
-- Verification
-- ============================================================================

SELECT 'User role added successfully!' as status;

-- Verify the enum values:
SELECT enumlabel as role
FROM pg_enum
WHERE enumtypid = 'public.app_role'::regtype
ORDER BY enumsortorder;
