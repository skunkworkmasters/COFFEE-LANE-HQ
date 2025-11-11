# Authentication Troubleshooting Guide

## 401 Error on Login

The `401 Unauthorized` error from `/auth/v1/token?grant_type=password` means Supabase is rejecting the credentials.

### Common Causes

1. **Incorrect email or password** - Most common cause
2. **User doesn't exist in the database**
3. **Email not confirmed** (if email confirmation is enabled)
4. **User account is disabled**
5. **Wrong Supabase project credentials in .env**

## Step-by-Step Debugging

### 1. Verify Supabase Connection

Check that your environment variables in [.env](.env) are correct:

```bash
VITE_SUPABASE_URL=https://furtvmeycaeswvfwettw.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=yJh...
```

### 2. Check if User Exists in Supabase

Run this query in **Supabase SQL Editor**:

```sql
-- List all users
SELECT
  id,
  email,
  created_at,
  email_confirmed_at,
  confirmed_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;
```

**If you don't see any users:**
- You need to create an account first via the signup page
- Or create one directly in Supabase

### 3. Check Email Confirmation Settings

In **Supabase Dashboard** → **Authentication** → **Providers** → **Email**:

- Check if "Confirm email" is enabled
- If enabled, users must confirm their email before logging in
- For development, you can disable this

### 4. Create Admin User Directly in Supabase

If you don't have any users yet, create one in **Supabase SQL Editor**:

```sql
-- First, sign up via the application UI, then run this to make yourself admin:

-- Find your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Assign admin role (replace 'USER-UUID-HERE' with actual ID from above)
INSERT INTO user_roles (user_id, role, tenant_id)
VALUES ('USER-UUID-HERE', 'admin', NULL)
ON CONFLICT (user_id, tenant_id)
DO UPDATE SET role = 'admin';
```

### 5. Verify User Has a Role

After signing up, check if the trigger assigned a role:

```sql
-- Check if user has a role assigned
SELECT
  au.email,
  ur.role,
  ur.tenant_id,
  ur.created_at
FROM auth.users au
LEFT JOIN user_roles ur ON ur.user_id = au.id
WHERE au.email = 'your-email@example.com';
```

**Expected result:** Should show 'user' role (or 'admin' if you manually assigned it)

**If role is NULL:**
- The trigger might not have fired
- Run the migration script again
- Or manually assign a role using the SQL above

### 6. Test Login with Browser Console

Open browser DevTools (F12) → Console tab, then run:

```javascript
// Test Supabase connection
const { data, error } = await window.supabase.auth.signInWithPassword({
  email: 'your-email@example.com',
  password: 'your-password'
});

console.log('Data:', data);
console.log('Error:', error);
```

**If error shows "Invalid login credentials":**
- Email or password is wrong
- Try resetting the password

**If error shows "Email not confirmed":**
- Check email for confirmation link
- Or disable email confirmation in Supabase settings

### 7. Reset Password via Supabase Dashboard

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Find your user
3. Click the three dots menu → **Reset Password**
4. Check your email for the password reset link

Or use SQL to set a new password hash (development only):

```sql
-- DO NOT USE IN PRODUCTION - only for development testing
-- This requires the pgcrypto extension
UPDATE auth.users
SET encrypted_password = crypt('new-password', gen_salt('bf'))
WHERE email = 'your-email@example.com';
```

### 8. Check Supabase Auth Logs

In **Supabase Dashboard** → **Authentication** → **Logs**:
- Look for failed login attempts
- Check the error messages

## Quick Fix: Create Test Admin Account

Run this complete script in **Supabase SQL Editor**:

```sql
-- Step 1: Create test user (use the signup UI instead for production)
-- For development only - sign up via UI at /auth instead

-- Step 2: After signing up via UI, find the user
SELECT id, email, created_at FROM auth.users
WHERE email = 'admin@example.com'; -- Replace with your email

-- Step 3: Assign admin role (replace UUID with actual user ID from step 2)
INSERT INTO user_roles (user_id, role, tenant_id)
VALUES (
  'REPLACE-WITH-USER-UUID-FROM-STEP-2',
  'admin'::user_role,
  NULL
)
ON CONFLICT (user_id, tenant_id)
DO UPDATE SET role = 'admin';

-- Step 4: Verify role was assigned
SELECT
  au.email,
  ur.role,
  ur.created_at
FROM auth.users au
JOIN user_roles ur ON ur.user_id = au.id
WHERE au.email = 'admin@example.com'; -- Replace with your email
```

## Testing Authentication Flow

### Test New User Signup

1. Go to `/auth`
2. Click "Sign up"
3. Enter email, password, and name
4. Click "Sign Up"
5. Check Supabase if email confirmation is required
6. Try to log in

### Test Admin Login

1. Ensure you've run the migration: [supabase-migration.sql](supabase-migration.sql)
2. Create account via `/auth` signup
3. Assign admin role via SQL (see above)
4. Sign out and sign in again
5. Should redirect to `/admin`

## Common Issues & Solutions

### "Invalid login credentials"
**Solution:** Double-check email and password. Password is case-sensitive.

### "Email not confirmed"
**Solution:**
- Check your email inbox for confirmation link
- Or disable email confirmation in Supabase settings (Auth → Providers → Email)

### "User not found"
**Solution:** Sign up first at `/auth` page

### Role not assigned after signup
**Solution:**
- Check if migration was run successfully
- Verify trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created_assign_role';`
- Manually assign role using SQL

### Infinite redirect loop
**Solution:**
- Clear browser localStorage and cookies
- Check browser console for errors
- Verify role in database matches expected value

## Enable Development Mode (No Email Confirmation)

In **Supabase Dashboard**:

1. Go to **Authentication** → **Providers** → **Email**
2. **Uncheck** "Confirm email"
3. Click "Save"

Now users can log in immediately after signup without email confirmation.

## Verify Environment Variables

Make sure your [.env](.env) file has the correct values:

```bash
# Check current values
cat .env

# Should show:
VITE_SUPABASE_URL=https://furtvmeycaeswvfwettw.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=yJh...
VITE_SUPABASE_PROJECT_ID=furtvmeycaeswvfwettw
```

After changing .env, restart the development server:
```bash
# If running locally
npm run dev

# If running via Docker
./deployment.sh
```

## Still Having Issues?

1. Check **Supabase Dashboard** → **Settings** → **API**
   - Verify the URL and anon/public key match your .env

2. Check **Supabase Dashboard** → **Authentication** → **Policies**
   - Ensure RLS policies aren't blocking access

3. Check browser DevTools → **Network** tab
   - Look for the failed request
   - Check the response body for detailed error message

4. Test with curl:
```bash
curl -X POST 'https://furtvmeycaeswvfwettw.supabase.co/auth/v1/token?grant_type=password' \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

This will show the exact error message from Supabase.
