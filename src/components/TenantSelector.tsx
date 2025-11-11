import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTenantContext } from "@/hooks/useTenantContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export function TenantSelector() {
  const { userRole } = useAuth();
  const { selectedTenantId, setSelectedTenantId } = useTenantContext();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userRole === "admin") {
      fetchTenants();
    }
  }, [userRole]);

  const fetchTenants = async () => {
    const { data, error } = await supabase
      .from("tenants")
      .select("id, name, slug")
      .eq("active", true)
      .order("name");

    if (!error && data) {
      setTenants(data);
    }
    setLoading(false);
  };

  // Only show for admins
  if (userRole !== "admin") {
    return null;
  }

  return (
    <div className="flex items-center gap-2 min-w-[250px]">
      <Building className="h-4 w-4 text-muted-foreground" />
      <Select
        value={selectedTenantId || "all"}
        onValueChange={(value) => setSelectedTenantId(value === "all" ? null : value)}
        disabled={loading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select Tenant" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Tenants (Admin View)</SelectItem>
          {tenants.map((tenant) => (
            <SelectItem key={tenant.id} value={tenant.id}>
              {tenant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
