
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Index from "./pages/Index";
import MarketplaceHome from "./pages/MarketplaceHome";
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
import ProviderMaintenance from "./pages/provider/ProviderMaintenance";
import ReservationForm from "./pages/provider/ReservationForm";
import ProviderVerify from "./pages/provider/ProviderVerify";
import AdminApprovals from "./pages/admin/AdminApprovals";
import { cn } from "./lib/utils";
import ProviderAnalytics from "./pages/provider/ProviderAnalytics";
import ProviderCalendar from "./pages/provider/ProviderCalendar";
import ProviderCustomers from "./pages/provider/ProviderCustomers";
import DemoDashboard from "./pages/DemoDashboard";

import { CommandMenu } from "./components/ui/command-menu";
import { useNavigate } from "react-router-dom";
import { useKeyboardShortcut } from "./hooks/useKeyboardShortcut";
import { CommandProvider } from "./context/CommandContext";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate(); // Add navigate
  const isProviderRoute = location.pathname.startsWith("/provider");

  const isDemoRoute = location.pathname.startsWith("/demo");

  // Global Shortcut: 'c' -> New Reservation
  useKeyboardShortcut(
    { key: 'c' },
    () => navigate('/provider/reservations/new'),
    { enabled: isProviderRoute } // Only active in provider area
  );

  return (
    <>
      {!isDemoRoute && <Navbar />}
      {!isDemoRoute && <CommandMenu />}
      <main
        className={cn(
          "min-h-screen",
          !isDemoRoute && "pt-16",
          isProviderRoute && "bg-[#F6FAF4]"
        )}
      >
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/demo/dashboard" element={<DemoDashboard />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/browse" element={<BrowseGear />} />
          <Route path="/add-rental" element={<AddRental />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/about" element={<About />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/admin/approvals" element={<AdminApprovals />} />
          <Route path="/marketplace" element={<MarketplaceHome />} />

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
            path="/provider/analytics"
            element={
              <ProviderRoute>
                <ProviderAnalytics />
              </ProviderRoute>
            }
          />
          <Route
            path="/provider/maintenance"
            element={
              <ProviderRoute>
                <ProviderMaintenance />
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
          <Route
            path="/provider/calendar"
            element={
              <ProviderRoute>
                <ProviderCalendar />
              </ProviderRoute>
            }
          />
          <Route
            path="/provider/customers"
            element={
              <ProviderRoute>
                <ProviderCustomers />
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
      <CommandProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </CommandProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
