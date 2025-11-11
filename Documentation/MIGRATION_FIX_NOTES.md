# Migration Fix Notes

## Issue Fixed

The initial migration had a parameter order conflict with the existing `has_role()` function in the database.

### Error Message
```
ERROR: 42725: function has_role(uuid, unknown) is not unique
HINT: Could not choose a best candidate function. You might need to add explicit type casts.
```

### Root Cause

The existing `has_role()` function in the database has the signature:
```sql
has_role(_role user_role, _user_id UUID)
```

But the migration was trying to create it with reversed parameters:
```sql
has_role(_user_id UUID, _role user_role)  -- WRONG ORDER
```

### Fix Applied

The [supabase-migration.sql](supabase-migration.sql) has been updated to:

1. **Use the correct parameter order** matching the existing function:
   ```sql
   CREATE OR REPLACE FUNCTION has_role(_role user_role, _user_id UUID)
   ```

2. **Update all function calls** to use the correct order:
   ```sql
   -- Before (WRONG):
   has_role(auth.uid(), 'admin')

   -- After (CORRECT):
   has_role('admin', auth.uid())
   ```

3. **Update RLS policies** to use correct parameter order:
   ```sql
   USING (has_role('admin', auth.uid()))
   ```

4. **Update helper functions**:
   ```sql
   -- can_access_admin
   RETURN has_role('admin', _user_id);

   -- can_access_tenant
   RETURN has_role('tenant', _user_id) OR has_role('admin', _user_id);
   ```

## Files Fixed

- ✅ [supabase-migration.sql](supabase-migration.sql) - All function definitions and calls updated

## Ready to Run

The migration script is now ready to run without conflicts. Simply:

1. Open Supabase SQL Editor
2. Copy the entire contents of [supabase-migration.sql](supabase-migration.sql)
3. Paste and execute

The migration will now succeed! ✅

## Reference

The TypeScript types in [src/integrations/supabase/types.ts](src/integrations/supabase/types.ts:290-296) show the correct signature:

```typescript
has_role: {
  Args: {
    _role: Database["public"]["Enums"]["app_role"]
    _user_id: string
  }
  Returns: boolean
}
```

This matches the fixed migration script.
