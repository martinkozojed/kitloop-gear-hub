import { Button } from "@/components/ui/button";
import ProviderLayout from "@/components/provider/ProviderLayout";
import { AlertTriangle, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ProviderPending = () => {
  const navigate = useNavigate();

  return (
    <ProviderLayout>
      <div className="relative max-w-6xl mx-auto py-12 px-6">
        <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] rounded-3xl pointer-events-none" />
        <div className="relative max-w-3xl mx-auto text-center space-y-6 bg-white/70 backdrop-blur-sm rounded-2xl p-10 shadow-lg pointer-events-auto">
          <div className="flex justify-center">
            <div className="h-16 w-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm">
              <AlertTriangle className="h-8 w-8" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Čekáme na schválení</h1>
            <p className="text-muted-foreground text-lg">
              Váš účet poskytovatele čeká na schválení administrátorem.
              Přístup k funkcím bude odemčen obvykle do 24 hodin.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Očekávaná doba: do 24 hodin
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate("/")}>
              Přejít na domovskou stránku
            </Button>
            <Button
              variant="secondary"
              onClick={() => (window.location.href = "mailto:support@kitloop.cz?subject=Schválení%20účtu&body=Dobrý%20den,%0A%0AČekám%20na%20schválení%20mého%20účtu%20poskytovatele.%0A%0ADěkuji")}
            >
              <Mail className="h-4 w-4 mr-2" />
              Kontaktovat podporu
            </Button>
          </div>
        </div>
      </div>
    </ProviderLayout>
  );
};

export default ProviderPending;
