import { Button } from "@/components/ui/button";
import ProviderLayout from "@/components/provider/ProviderLayout";
import { AlertTriangle, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ProviderPending = () => {
  const navigate = useNavigate();

  return (
    <ProviderLayout>
      <div className="relative max-w-5xl mx-auto py-16 px-6 text-center">
        <div className="absolute inset-0 rounded-3xl bg-white/50 backdrop-blur-sm pointer-events-none shadow-lg" />
        <div className="relative max-w-3xl mx-auto space-y-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm">
              <AlertTriangle className="h-8 w-8" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Waiting for approval</h1>
            <p className="text-muted-foreground text-lg">
              Your provider account is pending review. You’ll get access to the dashboard as soon as an admin approves your application.
            </p>
            <p className="text-sm text-muted-foreground">
              You can browse the workspace, but actions stay locked until approval.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate("/")}>
              Go to homepage
            </Button>
            <Button
              variant="secondary"
              onClick={() => (window.location.href = "mailto:support@kitloop.cz?subject=Provider%20approval")}
            >
              <Mail className="h-4 w-4 mr-2" />
              Contact support
            </Button>
          </div>
        </div>
      </div>
    </ProviderLayout>
  );
};

export default ProviderPending;
