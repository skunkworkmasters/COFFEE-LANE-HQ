-- Add tenant identifier column (4-digit random number)
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS tenant_code TEXT;

-- Generate random 4-digit codes for existing tenants
DO $$
DECLARE
  tenant_record RECORD;
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  FOR tenant_record IN SELECT id FROM public.tenants WHERE tenant_code IS NULL LOOP
    LOOP
      -- Generate random 4-digit code
      new_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

      -- Check if code already exists
      SELECT EXISTS(SELECT 1 FROM public.tenants WHERE tenant_code = new_code) INTO code_exists;

      -- If unique, assign it and break
      IF NOT code_exists THEN
        UPDATE public.tenants SET tenant_code = new_code WHERE id = tenant_record.id;
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- Make tenant_code NOT NULL and UNIQUE after populating
ALTER TABLE public.tenants
ALTER COLUMN tenant_code SET NOT NULL,
ADD CONSTRAINT unique_tenant_code UNIQUE(tenant_code);

-- Drop the old SERIAL order_number column
ALTER TABLE public.orders DROP COLUMN IF EXISTS order_number;

-- Add new order_number as TEXT to store formatted number
ALTER TABLE public.orders ADD COLUMN order_number TEXT;

-- Create sequence for each tenant's orders
-- This function generates the next order number for a tenant
CREATE OR REPLACE FUNCTION public.generate_order_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_code TEXT;
  v_next_seq INTEGER;
  v_order_number TEXT;
BEGIN
  -- Get tenant code
  SELECT tenant_code INTO v_tenant_code
  FROM public.tenants
  WHERE id = p_tenant_id;

  IF v_tenant_code IS NULL THEN
    RAISE EXCEPTION 'Tenant not found or has no tenant code';
  END IF;

  -- Get next sequence number for this tenant (count of existing orders + 1)
  SELECT COALESCE(COUNT(*), 0) + 1 INTO v_next_seq
  FROM public.orders
  WHERE tenant_id = p_tenant_id;

  -- Format: XXXX-YYYY (tenant code - order sequence)
  v_order_number := v_tenant_code || '-' || LPAD(v_next_seq::TEXT, 4, '0');

  RETURN v_order_number;
END;
$$;

-- Create trigger to automatically set order_number on insert
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := public.generate_order_number(NEW.tenant_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS trigger_set_order_number ON public.orders;
CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_number();

-- Update existing orders with formatted numbers
DO $$
DECLARE
  tenant_record RECORD;
  order_record RECORD;
  order_seq INTEGER;
BEGIN
  -- For each tenant
  FOR tenant_record IN SELECT id, tenant_code FROM public.tenants ORDER BY created_at LOOP
    order_seq := 1;

    -- Update each order for this tenant
    FOR order_record IN
      SELECT id FROM public.orders
      WHERE tenant_id = tenant_record.id
      ORDER BY created_at
    LOOP
      UPDATE public.orders
      SET order_number = tenant_record.tenant_code || '-' || LPAD(order_seq::TEXT, 4, '0')
      WHERE id = order_record.id;

      order_seq := order_seq + 1;
    END LOOP;
  END LOOP;
END $$;

-- Make order_number NOT NULL after populating
ALTER TABLE public.orders
ALTER COLUMN order_number SET NOT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_tenants_tenant_code ON public.tenants(tenant_code);

-- Create trigger function to auto-generate tenant code for new tenants
CREATE OR REPLACE FUNCTION public.generate_tenant_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  -- Only generate if tenant_code is not provided
  IF NEW.tenant_code IS NULL THEN
    LOOP
      -- Generate random 4-digit code
      new_code := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');

      -- Check if code already exists
      SELECT EXISTS(SELECT 1 FROM public.tenants WHERE tenant_code = new_code) INTO code_exists;

      -- If unique, assign it and break
      IF NOT code_exists THEN
        NEW.tenant_code := new_code;
        EXIT;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for new tenant code generation
DROP TRIGGER IF EXISTS trigger_generate_tenant_code ON public.tenants;
CREATE TRIGGER trigger_generate_tenant_code
  BEFORE INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_tenant_code();
