import { Button } from "@/components/ui/button";
import { AlertTriangle, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ProviderPending = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-emerald-50 px-6 py-16">
      <div className="relative max-w-3xl w-full text-center space-y-6 bg-white/90 backdrop-blur-sm rounded-2xl p-10 shadow-xl border border-white/70 overflow-hidden">
        <div className="pointer-events-none absolute -left-16 -top-16 h-40 w-40 rounded-full bg-amber-100/40 blur-3xl" />
        <div className="pointer-events-none absolute -right-12 bottom-0 h-48 w-48 rounded-full bg-emerald-100/40 blur-3xl" />
        <div className="relative space-y-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm">
              <AlertTriangle className="h-8 w-8" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Waiting for approval</h1>
            <p className="text-muted-foreground text-lg">
              Your provider account is pending review. The workspace stays locked until an admin approves your application.
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
    </div>
  );
};

export default ProviderPending;
