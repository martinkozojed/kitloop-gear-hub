import { Button } from "@/components/ui/button";
import ProviderLayout from "@/components/provider/ProviderLayout";
import { AlertTriangle, Mail, Calendar, Package, List, BarChart3, Clock, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ProviderPending = () => {
  const navigate = useNavigate();

  return (
    <ProviderLayout locked>
      <div className="relative">
        {/* Faded preview shell */}
        <div className="pointer-events-none opacity-70 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Active rentals", value: "0", sub: "This week ▲ 0%" },
              { label: "Returns today", value: "0", sub: "No returns scheduled" },
              { label: "Daily revenue", value: "0 Kč", sub: "vs yesterday 0%" },
            ].map((kpi, idx) => (
              <div key={idx} className="rounded-2xl border border-border bg-white shadow-sm p-4">
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="text-3xl font-semibold text-foreground mt-2">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="font-semibold text-foreground">Today&apos;s agenda</span>
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-lg bg-white/70 border border-border"></div>
              ))}
            </div>
            <div className="rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <BarChart3 className="h-4 w-4" />
                <span className="font-semibold text-foreground">System status</span>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 border">
                  <Clock className="h-3 w-3" /> Pending approval
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 border">
                  <Shield className="h-3 w-3" /> Actions locked
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[{ icon: Calendar, title: "Calendar", desc: "Locked until approval" },
              { icon: Package, title: "Inventory", desc: "Locked until approval" },
              { icon: List, title: "Reservations", desc: "Locked until approval" }].map((card, idx) => {
                const Icon = card.icon;
                return (
                  <div key={idx} className="rounded-xl border border-dashed border-muted-foreground/30 bg-white p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <div className="h-10 w-10 rounded-full bg-muted/40 shadow-sm border flex items-center justify-center">
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className="font-semibold text-foreground">{card.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{card.desc}</p>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Overlay card */}
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div className="relative max-w-3xl w-full text-center space-y-6 bg-white/92 backdrop-blur-sm rounded-2xl p-10 shadow-xl border border-white/70 overflow-hidden pointer-events-auto">
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
                <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
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
      </div>
    </ProviderLayout>
  );
};

export default ProviderPending;
