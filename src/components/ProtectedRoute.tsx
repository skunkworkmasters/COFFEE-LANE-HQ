import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["app_role"];

interface ProtectedRouteProps {
  /**
   * Required role to access this route
   * If not specified, only authentication is required
   */
  requiredRole?: UserRole;

  /**
   * Alternative roles that can also access this route
   */
  allowedRoles?: UserRole[];

  /**
   * Where to redirect if user is not authenticated
   */
  redirectTo?: string;
}

export function ProtectedRoute({
  requiredRole,
  allowedRoles = [],
  redirectTo = "/auth"
}: ProtectedRouteProps) {
  const { user, userRole, loading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to auth if not logged in
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If no role requirement, just check authentication
  if (!requiredRole && allowedRoles.length === 0) {
    return <Outlet />;
  }

  // Check if user has required role or any of the allowed roles
  const hasAccess =
    userRole === requiredRole ||
    allowedRoles.includes(userRole as UserRole) ||
    // Admins have access to everything
    userRole === "admin";

  if (!hasAccess) {
    // Redirect to appropriate dashboard based on user's actual role
    const redirectPath = getRoleBasedRedirect(userRole as UserRole);
    return <Navigate to={redirectPath} replace />;
  }

  return <Outlet />;
}

/**
 * Helper function to determine redirect path based on user role
 */
function getRoleBasedRedirect(role: UserRole | null): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "tenant":
      return "/tenant";
    case "user":
      return "/pos"; // Staff users go to POS
    default:
      return "/auth";
  }
}
