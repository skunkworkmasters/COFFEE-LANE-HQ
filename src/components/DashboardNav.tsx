import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Home, LayoutDashboard, ShieldCheck, Menu, LogOut } from "lucide-react";
import { TenantSelector } from "./TenantSelector";

export function DashboardNav() {
  const { userRole, signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center gap-3">
            <img src="/logo(800 x 200 px) (800 x 100 px).png" alt="Nomad Bean Co." className="h-12 w-auto" />
            {userRole === "admin" && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                Admin
              </span>
            )}
            {userRole === "tenant" && (
              <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                Tenant
              </span>
            )}
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4">
            {/* Tenant Selector - Admin only */}
            {userRole === "admin" && <TenantSelector />}

            {/* POS Link - Visible to all */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open("/pos", "_blank")}
              className="gap-2"
            >
              <Home className="h-4 w-4" />
              POS
            </Button>

            {/* Tenant Dashboard - Visible to Tenant and Admin */}
            {(userRole === "tenant" || userRole === "admin") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/tenant")}
                className="gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />
                Tenant Dashboard
              </Button>
            )}

            {/* Admin Dashboard - Admin only */}
            {userRole === "admin" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/admin")}
                className="gap-2"
              >
                <ShieldCheck className="h-4 w-4" />
                Admin Dashboard
              </Button>
            )}

            {/* User Info & Sign Out */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-2">
                  {user?.email?.split("@")[0] || "User"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      Role: {userRole}
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user?.email?.split("@")[0] || "User"}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {userRole}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Navigation Links */}
                <DropdownMenuItem onClick={() => window.open("/pos", "_blank")} className="gap-2">
                  <Home className="h-4 w-4" />
                  POS
                </DropdownMenuItem>

                {(userRole === "tenant" || userRole === "admin") && (
                  <DropdownMenuItem onClick={() => navigate("/tenant")} className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    Tenant Dashboard
                  </DropdownMenuItem>
                )}

                {userRole === "admin" && (
                  <DropdownMenuItem onClick={() => navigate("/admin")} className="gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Admin Dashboard
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 gap-2">
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
