import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { TenantProvider } from "@/hooks/useTenantContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import POS from "./pages/POS";
import POSDaySummary from "./pages/POSDaySummary";
import TenantDashboard from "./pages/TenantDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import PendingApproval from "./pages/PendingApproval";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <TenantProvider>
            <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/pending-approval" element={<PendingApproval />} />

            {/* Protected routes - Admin only */}
            <Route element={<ProtectedRoute requiredRole="admin" />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            {/* Protected routes - Tenant Dashboard (Tenant and Admin only) */}
            <Route element={<ProtectedRoute requiredRole="tenant" />}>
              <Route path="/tenant" element={<TenantDashboard />} />
            </Route>

            {/* Protected routes - POS (Tenant, User/Staff, and Admin) */}
            <Route element={<ProtectedRoute requiredRole="user" allowedRoles={["tenant"]} />}>
              <Route path="/pos" element={<POS />} />
              <Route path="/pos/day-summary" element={<POSDaySummary />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </TenantProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
