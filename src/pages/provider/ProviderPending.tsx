import { Button } from "@/components/ui/button";
import ProviderLayout from "@/components/provider/ProviderLayout";
import { AlertTriangle, Mail, Lock, Calendar, Package, List } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ProviderPending = () => {
  const navigate = useNavigate();

  return (
    <ProviderLayout locked>
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-50 via-white to-emerald-50 opacity-70 pointer-events-none" />
          <div className="relative px-6 py-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="h-14 w-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm">
                <AlertTriangle className="h-7 w-7" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground">Waiting for approval</h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Your provider account is pending review. The workspace stays locked until an admin approves your application.
            </p>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[{ icon: Calendar, title: "Today", desc: "Calendar is locked" },
            { icon: Package, title: "Inventory", desc: "Inventory access is locked" },
            { icon: List, title: "Reservations", desc: "Reservations are locked" }].map((card, idx) => {
              const Icon = card.icon;
              return (
                <div key={idx} className="rounded-xl border border-dashed border-muted-foreground/30 bg-muted/30 p-4 flex flex-col gap-3 items-start">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <div className="h-10 w-10 rounded-full bg-white shadow-sm border flex items-center justify-center">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="font-semibold text-foreground">{card.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {card.desc}
                  </p>
                </div>
              );
            })}
        </div>
      </div>
    </ProviderLayout>
  );
};

export default ProviderPending;
