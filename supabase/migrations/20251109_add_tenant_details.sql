-- Add additional tenant information fields
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS region TEXT,
ADD COLUMN IF NOT EXISTS country TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en',
ADD COLUMN IF NOT EXISTS staff_size INTEGER,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.tenants.city IS 'City where the tenant is located';
COMMENT ON COLUMN public.tenants.region IS 'State/Province/Region';
COMMENT ON COLUMN public.tenants.country IS 'Country code or name';
COMMENT ON COLUMN public.tenants.address IS 'Full street address';
COMMENT ON COLUMN public.tenants.language IS 'Preferred language code (e.g., en, es, fr)';
COMMENT ON COLUMN public.tenants.staff_size IS 'Number of staff members';
COMMENT ON COLUMN public.tenants.contact_email IS 'Primary contact email';
COMMENT ON COLUMN public.tenants.contact_phone IS 'Primary contact phone';
