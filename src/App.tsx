
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Index from "./pages/Index";
import HowItWorks from "./pages/HowItWorks";
import BrowseGear from "./pages/BrowseGear";
import AddRental from "./pages/AddRental";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import NotFound from "./pages/NotFound";
import About from "./pages/About";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import ProviderRoute from "./components/auth/ProviderRoute";
import ProviderSetup from "./pages/provider/ProviderSetup";
import DashboardOverview from "./pages/provider/DashboardOverview";
import ProviderSettings from "./pages/provider/ProviderSettings";
import ProviderInventory from "./pages/provider/ProviderInventory";
import InventoryForm from "./pages/provider/InventoryForm";
import InventoryImport from "./pages/provider/InventoryImport";
import ProviderReservations from "./pages/provider/ProviderReservations";
import ReservationForm from "./pages/provider/ReservationForm";
import ProviderVerify from "./pages/provider/ProviderVerify";
import AdminApprovals from "./pages/AdminApprovals";
import { cn } from "./lib/utils";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const location = useLocation();
  const isProviderRoute = location.pathname.startsWith("/provider");

  return (
    <>
      <Navbar />
      <main
        className={cn(
          "min-h-screen pt-16",
          isProviderRoute && "bg-[#F6FAF4]"
        )}
      >
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/browse" element={<BrowseGear />} />
          <Route path="/add-rental" element={<AddRental />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/about" element={<About />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/admin/approvals" element={<AdminApprovals />} />

          {/* Provider Routes */}
          <Route path="/provider/setup" element={<ProviderSetup />} />
          <Route
            path="/provider/dashboard"
            element={
              <ProviderRoute>
                <DashboardOverview />
              </ProviderRoute>
            }
          />
          <Route
            path="/provider/inventory"
            element={
              <ProviderRoute>
                <ProviderInventory />
              </ProviderRoute>
            }
          />
          <Route
            path="/provider/inventory/new"
            element={
              <ProviderRoute>
                <InventoryForm />
              </ProviderRoute>
            }
          />
          <Route
            path="/provider/inventory/:id/edit"
            element={
              <ProviderRoute>
                <InventoryForm />
              </ProviderRoute>
            }
          />
          <Route
            path="/provider/inventory/import"
            element={
              <ProviderRoute>
                <InventoryImport />
              </ProviderRoute>
            }
          />
          <Route
            path="/provider/reservations"
            element={
              <ProviderRoute>
                <ProviderReservations />
              </ProviderRoute>
            }
          />
          <Route
            path="/provider/reservations/new"
            element={
              <ProviderRoute>
                <ReservationForm />
              </ProviderRoute>
            }
          />
          <Route
            path="/provider/settings"
            element={
              <ProviderRoute>
                <ProviderSettings />
              </ProviderRoute>
            }
          />
          <Route
            path="/provider/dashboard/verify"
            element={
              <ProviderRoute>
                <ProviderVerify />
              </ProviderRoute>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {!isProviderRoute && <Footer />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
