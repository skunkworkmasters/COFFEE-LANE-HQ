import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "./useAuth";

interface TenantContextType {
  selectedTenantId: string | null;
  setSelectedTenantId: (tenantId: string | null) => void;
  isAdminViewingTenant: boolean;
}

const TenantContext = createContext<TenantContextType>({
  selectedTenantId: null,
  setSelectedTenantId: () => {},
  isAdminViewingTenant: false,
});

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { userRole, tenantId } = useAuth();
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  // For admins, allow manual tenant selection
  // For tenants, always use their assigned tenant
  useEffect(() => {
    if (userRole === "tenant" && tenantId) {
      setSelectedTenantId(tenantId);
    } else if (userRole === "admin" && !selectedTenantId && tenantId) {
      // Admin can optionally have a default tenant
      setSelectedTenantId(null);
    }
  }, [userRole, tenantId, selectedTenantId]);

  const isAdminViewingTenant = userRole === "admin" && selectedTenantId !== null;

  return (
    <TenantContext.Provider
      value={{
        selectedTenantId: selectedTenantId || tenantId,
        setSelectedTenantId,
        isAdminViewingTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenantContext = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenantContext must be used within TenantProvider");
  }
  return context;
};
