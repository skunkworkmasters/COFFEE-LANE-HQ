# CoffeeLane Role-Based Architecture

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │    Admin     │  │   Tenant     │  │     User     │          │
│  │  Dashboard   │  │  Dashboard   │  │   Landing    │          │
│  │   /admin     │  │   /tenant    │  │      /       │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                  │                  │
│         │         ┌───────┴────────┐         │                  │
│         │         │   POS System   │         │                  │
│         │         │     /pos       │         │                  │
│         │         └────────────────┘         │                  │
│         │                                    │                  │
│  ┌──────┴────────────────────────────────────┴───────┐          │
│  │          ProtectedRoute Component                 │          │
│  │  - Check authentication                           │          │
│  │  - Verify role permissions                        │          │
│  │  - Redirect unauthorized users                    │          │
│  └──────────────────────┬────────────────────────────┘          │
│                         │                                        │
│  ┌──────────────────────┴────────────────────────────┐          │
│  │           useAuth Hook (Context)                  │          │
│  │  - user: User | null                              │          │
│  │  - userRole: "admin" | "tenant" | "user" | null   │          │
│  │  - tenantId: string | null                        │          │
│  │  - loading: boolean                               │          │
│  │  - signOut: () => Promise<void>                   │          │
│  └──────────────────────┬────────────────────────────┘          │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
                          │ Supabase Client
                          │
┌─────────────────────────┼────────────────────────────────────────┐
│                         ▼                                        │
│                  SUPABASE BACKEND                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────┐         │
│  │              Authentication (auth.users)           │         │
│  │  - Email/Password authentication                   │         │
│  │  - Session management                              │         │
│  │  - User metadata                                   │         │
│  └──────────────────────┬─────────────────────────────┘         │
│                         │                                        │
│                         │ Trigger on INSERT                      │
│                         ▼                                        │
│  ┌────────────────────────────────────────────────────┐         │
│  │     assign_default_user_role() Function            │         │
│  │  - Automatically assigns 'user' role               │         │
│  │  - Executes on new user signup                     │         │
│  └──────────────────────┬─────────────────────────────┘         │
│                         │                                        │
│                         ▼                                        │
│  ┌────────────────────────────────────────────────────┐         │
│  │              user_roles Table                      │         │
│  │  ┌──────────┬──────────┬───────────┬─────────┐    │         │
│  │  │ user_id  │   role   │ tenant_id │ created │    │         │
│  │  ├──────────┼──────────┼───────────┼─────────┤    │         │
│  │  │ uuid-123 │  admin   │   NULL    │ 2025... │    │         │
│  │  │ uuid-456 │  tenant  │  t-uuid-1 │ 2025... │    │         │
│  │  │ uuid-789 │  user    │   NULL    │ 2025... │    │         │
│  │  └──────────┴──────────┴───────────┴─────────┘    │         │
│  │                                                     │         │
│  │  Enum: app_role ('admin', 'tenant', 'user')        │         │
│  └──────────────────────┬─────────────────────────────┘         │
│                         │                                        │
│  ┌──────────────────────┴─────────────────────────────┐         │
│  │         Row Level Security (RLS) Policies          │         │
│  │  - Users can view their own roles                  │         │
│  │  - Admins can view/manage all roles                │         │
│  │  - Tenants can only access their tenant data       │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                  │
│  ┌────────────────────────────────────────────────────┐         │
│  │              Helper Functions                      │         │
│  │  - has_role(user_id, role)                         │         │
│  │  - get_user_primary_role(user_id)                  │         │
│  │  - can_access_admin(user_id)                       │         │
│  │  - can_access_tenant(user_id)                      │         │
│  │  - get_user_tenant_id(user_id)                     │         │
│  └────────────────────────────────────────────────────┘         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## User Journey Flow

### New User Registration

```
User → /auth (Sign Up)
   │
   ▼
Fill Form (email, password, name)
   │
   ▼
Submit → Supabase Auth
   │
   ├─→ Create user in auth.users
   │
   ├─→ Trigger: assign_default_user_role()
   │      │
   │      └─→ INSERT into user_roles
   │             role = 'user'
   │             tenant_id = NULL
   │
   └─→ Return session
        │
        ▼
   useAuth fetches role
        │
        ▼
   Index page redirects
        │
        └─→ Stay on / (user role)
```

### Admin Login

```
Admin → /auth (Sign In)
   │
   ▼
Enter credentials
   │
   ▼
Supabase Auth validates
   │
   ▼
useAuth fetches role
   │
   ├─→ Query: user_roles.role = 'admin'
   │
   └─→ Set userRole = 'admin'
        │
        ▼
   Index page useEffect
        │
        ▼
   Redirect to /admin
        │
        ▼
   ProtectedRoute checks role
        │
        ├─→ userRole === 'admin' ✓
        │
        └─→ Render AdminDashboard
```

### Tenant Login

```
Tenant → /auth (Sign In)
   │
   ▼
Enter credentials
   │
   ▼
Supabase Auth validates
   │
   ▼
useAuth fetches role
   │
   ├─→ Query: user_roles WHERE user_id
   │      Returns: role = 'tenant', tenant_id = 'xyz'
   │
   └─→ Set userRole = 'tenant'
   │   Set tenantId = 'xyz'
        │
        ▼
   Index page useEffect
        │
        ▼
   Redirect to /tenant
        │
        ▼
   ProtectedRoute checks role
        │
        ├─→ userRole === 'tenant' ✓
        │
        └─→ Render TenantDashboard
             │
             └─→ Data filtered by tenantId (RLS)
```

## Route Protection Logic

```
User navigates to protected route
   │
   ▼
ProtectedRoute component
   │
   ├─→ Is loading? → Show spinner
   │
   ├─→ No user? → Redirect to /auth
   │
   └─→ Has user
        │
        ├─→ No role requirement?
        │      └─→ Allow access
        │
        └─→ Has role requirement
               │
               ├─→ userRole === requiredRole? → Allow
               │
               ├─→ userRole === 'admin'? → Allow (admin bypass)
               │
               └─→ Else → Redirect to user's dashboard
                           │
                           ├─→ admin → /admin
                           ├─→ tenant → /tenant
                           └─→ user → /
```

## Database Trigger Flow

```
                    New User Inserted into auth.users
                                  │
                                  ▼
         ┌────────────────────────────────────────────┐
         │  TRIGGER: on_auth_user_created_assign_role │
         │  AFTER INSERT ON auth.users                │
         └────────────────┬───────────────────────────┘
                          │
                          ▼
         ┌────────────────────────────────────────────┐
         │  FUNCTION: assign_default_user_role()      │
         │                                            │
         │  BEGIN                                     │
         │    INSERT INTO user_roles (                │
         │      user_id,                              │
         │      role,                                 │
         │      tenant_id                             │
         │    )                                       │
         │    VALUES (                                │
         │      NEW.id,                               │
         │      'user',                               │
         │      NULL                                  │
         │    )                                       │
         │    ON CONFLICT DO NOTHING;                 │
         │                                            │
         │    RETURN NEW;                             │
         │  END;                                      │
         └────────────────┬───────────────────────────┘
                          │
                          ▼
                Role assigned successfully
                          │
                          ▼
              User can now authenticate
```

## Permission Matrix

```
┌──────────────┬───────┬────────┬──────┐
│    Route     │ Admin │ Tenant │ User │
├──────────────┼───────┼────────┼──────┤
│ /            │   ✓   │   ✓    │  ✓   │
│ /auth        │   ✓   │   ✓    │  ✓   │
│ /admin       │   ✓   │   ✗    │  ✗   │
│ /tenant      │   ✓   │   ✓    │  ✗   │
│ /pos         │   ✓   │   ✓    │  ✗   │
└──────────────┴───────┴────────┴──────┘

┌───────────────────────┬───────┬────────┬──────┐
│    Data Access        │ Admin │ Tenant │ User │
├───────────────────────┼───────┼────────┼──────┤
│ All Tenants           │   ✓   │   ✗    │  ✗   │
│ Own Tenant            │   ✓   │   ✓    │  ✗   │
│ All Orders            │   ✓   │   ✗    │  ✗   │
│ Own Tenant Orders     │   ✓   │   ✓    │  ✗   │
│ User Roles (manage)   │   ✓   │   ✗    │  ✗   │
│ Own Profile           │   ✓   │   ✓    │  ✓   │
└───────────────────────┴───────┴────────┴──────┘
```

## Component Hierarchy

```
App.tsx
  │
  ├─── AuthProvider (Context)
  │      └─── useAuth Hook
  │             ├─── user
  │             ├─── userRole
  │             ├─── tenantId
  │             ├─── loading
  │             └─── signOut()
  │
  └─── Routes
         ├─── / (Index)
         │      └─── Public landing page
         │
         ├─── /auth (Auth)
         │      └─── Sign in / Sign up
         │
         ├─── ProtectedRoute (requiredRole="admin")
         │      └─── /admin (AdminDashboard)
         │
         └─── ProtectedRoute (requiredRole="tenant")
                ├─── /tenant (TenantDashboard)
                └─── /pos (POS)
```

## Data Flow

```
┌────────────┐
│   React    │
│   Component│
└─────┬──────┘
      │
      │ useAuth()
      ▼
┌────────────┐
│  Auth Hook │
│  (Context) │
└─────┬──────┘
      │
      │ supabase.auth.getUser()
      │ supabase.from('user_roles').select()
      ▼
┌────────────┐
│  Supabase  │
│   Client   │
└─────┬──────┘
      │
      │ API Request
      ▼
┌────────────┐
│  Supabase  │
│   Server   │
└─────┬──────┘
      │
      │ Check RLS Policies
      ▼
┌────────────┐
│ PostgreSQL │
│  Database  │
└─────┬──────┘
      │
      │ Return Data
      ▼
┌────────────┐
│   React    │
│   State    │
└────────────┘
```

## Security Layers

```
Layer 1: Client-Side Route Protection
   │
   ├─→ ProtectedRoute component
   └─→ Redirects based on userRole
        │
        ▼
Layer 2: Authentication Check
   │
   ├─→ Supabase Auth session validation
   └─→ JWT token verification
        │
        ▼
Layer 3: Role Verification
   │
   ├─→ Query user_roles table
   └─→ Verify role matches requirement
        │
        ▼
Layer 4: Row Level Security (RLS)
   │
   ├─→ PostgreSQL policies
   └─→ Filter data based on role & tenant_id
        │
        ▼
Layer 5: Database Functions
   │
   ├─→ has_role() checks
   └─→ SECURITY DEFINER functions
        │
        ▼
     Data Access Granted
```

## File Structure

```
coffeelane-hq/
│
├── src/
│   ├── components/
│   │   └── ProtectedRoute.tsx       ← Route guard component
│   │
│   ├── hooks/
│   │   └── useAuth.tsx               ← Auth context & hook
│   │
│   ├── pages/
│   │   ├── Index.tsx                 ← Landing page with redirects
│   │   ├── Auth.tsx                  ← Sign in / Sign up
│   │   ├── AdminDashboard.tsx        ← Admin only
│   │   ├── TenantDashboard.tsx       ← Tenant + Admin
│   │   └── POS.tsx                   ← Tenant + Admin
│   │
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts             ← Supabase client
│   │       └── types.ts              ← Database types (updated)
│   │
│   └── App.tsx                       ← Main app with routes
│
├── supabase-migration.sql            ← Database migration
├── ROLE_BASED_ROUTING_README.md      ← Full documentation
├── QUICK_START_ROLES.md              ← Quick reference
├── IMPLEMENTATION_SUMMARY.md         ← Summary document
└── ARCHITECTURE_DIAGRAM.md           ← This file
```

This architecture provides a secure, scalable, and maintainable role-based access control system for the CoffeeLane application.
