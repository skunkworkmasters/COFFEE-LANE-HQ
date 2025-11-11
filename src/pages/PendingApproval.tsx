import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Mail, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function PendingApproval() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user has a role assigned, redirect them to appropriate page
    if (!loading && user && userRole) {
      if (userRole === "admin") {
        navigate("/admin");
      } else if (userRole === "tenant") {
        navigate("/tenant");
      } else {
        // If user role exists but not admin or tenant, assume staff
        navigate("/pos");
      }
    }
  }, [user, userRole, loading, navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="relative">
              <Clock className="w-24 h-24 text-primary animate-pulse" />
              <CheckCircle className="w-8 h-8 text-primary absolute -bottom-1 -right-1 bg-background rounded-full" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">
            Account Under Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-4">
            <div className="flex justify-center mb-4">
              <img src="/logo(800 x 200 px) (800 x 100 px).png" alt="Nomad Bean Co." className="h-20 w-auto" />
            </div>
            <p className="text-lg text-muted-foreground">
              Thank you for registering with Nomad Bean Co.!
            </p>
            <div className="bg-muted p-6 rounded-lg space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-semibold">Your account is being reviewed</p>
                  <p className="text-sm text-muted-foreground">
                    An administrator will review your registration and assign you to a coffee shop location.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                <div className="text-left">
                  <p className="font-semibold">What happens next?</p>
                  <p className="text-sm text-muted-foreground">
                    Once approved, you'll receive an email notification and gain access to your assigned role (Staff or Tenant Admin).
                  </p>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground mb-4">
                Registered with: <span className="font-semibold">{user?.email}</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Thank you for your patience. We'll process your request as soon as possible.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={handleRefresh}
              variant="default"
              className="flex-1"
            >
              Check Status
            </Button>
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="flex-1"
            >
              Sign Out
            </Button>
          </div>

          <div className="text-center pt-4">
            <p className="text-xs text-muted-foreground">
              Need help? Contact your administrator at{" "}
              <a href="mailto:admin@nomadbeancompany.com" className="text-primary hover:underline">
                admin@nomadbeancompany.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
