
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import NotFound from "./pages/NotFound";
import { supabase } from "@/lib/supabase";
import Navbar from "./components/layout/Navbar";
import Footer from "./components/layout/Footer";
import ProviderRoute from "./components/auth/ProviderRoute";
import AdminRoute from "./components/auth/AdminRoute";
import { cn } from "./lib/utils";
import BuildStamp from "./components/layout/BuildStamp";

import { CommandMenu } from "./components/ui/command-menu";
import { useNavigate } from "react-router-dom";
import { useKeyboardShortcut } from "./hooks/useKeyboardShortcut";
import { CommandProvider } from "./context/CommandContext";

// Lazy-loaded routes for code splitting (reduces initial bundle)
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const BrowseGear = lazy(() => import("./pages/BrowseGear"));
const AddRental = lazy(() => import("./pages/AddRental"));
const About = lazy(() => import("./pages/About"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const DemoDashboard = lazy(() => import("./pages/DemoDashboard"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

// Provider pages (heavy)
const ProviderSetup = lazy(() => import("./pages/provider/ProviderSetup"));
const ProviderPending = lazy(() => import("./pages/provider/ProviderPending"));
const DashboardOverview = lazy(() => import("./pages/provider/DashboardOverview"));
const ProviderSettings = lazy(() => import("./pages/provider/ProviderSettings"));
const ProviderInventory = lazy(() => import("./pages/provider/ProviderInventory"));
const InventoryForm = lazy(() => import("./pages/provider/InventoryForm"));
const InventoryImport = lazy(() => import("./pages/provider/InventoryImport"));
const ProviderReservations = lazy(() => import("./pages/provider/ProviderReservations"));
const ReservationDetail = lazy(() => import("./pages/provider/ReservationDetail"));
const ReservationHandoverPrint = lazy(() => import("./pages/provider/ReservationHandoverPrint"));
const ProviderMaintenance = lazy(() => import("./pages/provider/ProviderMaintenance"));
const ReservationForm = lazy(() => import("./pages/provider/ReservationForm"));
const ProviderVerify = lazy(() => import("./pages/provider/ProviderVerify"));
const ProviderAnalytics = lazy(() => import("./pages/provider/ProviderAnalytics"));
const ProviderCalendar = lazy(() => import("./pages/provider/ProviderCalendar"));
const ProviderCustomers = lazy(() => import("./pages/provider/ProviderCustomers"));
const ProviderAccounts = lazy(() => import("./pages/provider/ProviderAccounts"));

// Admin pages
const Observability = lazy(() => import("./pages/admin/Observability"));
const AuditLog = lazy(() => import("./pages/admin/AuditLog"));
const ProviderApprovals = lazy(() => import("./pages/admin/ProviderApprovals"));

// Loading fallback for lazy routes
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-pulse text-muted-foreground">Loading...</div>
  </div>
);

const queryClient = new QueryClient();

const AppRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate(); // Add navigate
  const isProviderRoute = location.pathname.startsWith("/provider");
  const isOnboardingRoute = location.pathname.startsWith("/onboarding");

  const demoEnabled = import.meta.env.VITE_ENABLE_DEMO === "true";
  const isDemoRoute = demoEnabled && location.pathname.startsWith("/demo");

  // Global Shortcut: 'c' -> New Reservation
  useKeyboardShortcut(
    { key: 'c' },
    () => navigate('/provider/reservations/new'),
    { enabled: isProviderRoute } // Only active in provider area
  );

  return (
    <>
      {!isDemoRoute && !isOnboardingRoute && <Navbar />}
      {!isDemoRoute && !isOnboardingRoute && <CommandMenu />}
      <main
        className={cn(
          "min-h-screen",
          !isDemoRoute && !isOnboardingRoute && "pt-16",
          isProviderRoute && "bg-muted/50"
        )}
      >
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Navigate to="/onboarding" replace />} />
            <Route
              path="/demo/dashboard"
              element={
                import.meta.env.VITE_ENABLE_DEMO === 'true'
                  ? <DemoDashboard />
                  : <Navigate to="/" replace />
              }
            />
            <Route path="/how-it-works" element={<HowItWorks />} />
            {/* Marketplace - gated by VITE_ENABLE_MARKETPLACE */}
            <Route
              path="/browse"
              element={
                import.meta.env.VITE_ENABLE_MARKETPLACE === 'true'
                  ? <BrowseGear />
                  : <Navigate to="/" replace />
              }
            />
            <Route
              path="/add-rental"
              element={
                import.meta.env.VITE_ENABLE_MARKETPLACE === 'true'
                  ? <AddRental />
                  : <Navigate to="/" replace />
              }
            />
            <Route path="/my-reservations" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/onboarding/*" element={<Onboarding />} />
            <Route
              path="/admin/observability"
              element={
                <AdminRoute>
                  <Observability />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/providers"
              element={
                <AdminRoute>
                  <ProviderApprovals />
                </AdminRoute>
              }
            />
            <Route
              path="/admin/audit"
              element={
                <AdminRoute>
                  <AuditLog />
                </AdminRoute>
              }
            />
            <Route path="/admin/approvals" element={<Navigate to="/admin/providers" replace />} />
            <Route path="/approvals" element={<Navigate to="/admin/providers" replace />} />
            <Route path="/marketplace" element={<Navigate to="/" replace />} />

            {/* Provider Routes */}
            <Route path="/provider/setup" element={<ProviderSetup />} />
            <Route path="/provider/pending" element={<ProviderPending />} />
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
              path="/provider/reservations/edit/:id"
              element={
                <ProviderRoute>
                  <ReservationDetail />
                </ProviderRoute>
              }
            />
            <Route
              path="/provider/reservations/:id/print"
              element={
                <ProviderRoute>
                  <ReservationHandoverPrint />
                </ProviderRoute>
              }
            />
            {/* Analytics - gated by VITE_ENABLE_ANALYTICS */}
            <Route
              path="/provider/analytics"
              element={
                <ProviderRoute>
                  {import.meta.env.VITE_ENABLE_ANALYTICS === 'true'
                    ? <ProviderAnalytics />
                    : <Navigate to="/provider/dashboard" replace />}
                </ProviderRoute>
              }
            />
            {/* Maintenance - gated by VITE_ENABLE_MAINTENANCE */}
            <Route
              path="/provider/maintenance"
              element={
                <ProviderRoute>
                  {import.meta.env.VITE_ENABLE_MAINTENANCE === 'true'
                    ? <ProviderMaintenance />
                    : <Navigate to="/provider/dashboard" replace />}
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
            {/* Calendar - gated by VITE_ENABLE_CALENDAR */}
            <Route
              path="/provider/calendar"
              element={
                <ProviderRoute>
                  {import.meta.env.VITE_ENABLE_CALENDAR === 'true'
                    ? <ProviderCalendar />
                    : <Navigate to="/provider/dashboard" replace />}
                </ProviderRoute>
              }
            />
            {/* CRM (Customers) - gated by VITE_ENABLE_CRM */}
            <Route
              path="/provider/customers"
              element={
                <ProviderRoute>
                  {import.meta.env.VITE_ENABLE_CRM === 'true'
                    ? <ProviderCustomers />
                    : <Navigate to="/provider/dashboard" replace />}
                </ProviderRoute>
              }
            />
            {/* Accounts - gated by VITE_ENABLE_ACCOUNTS */}
            <Route
              path="/provider/accounts"
              element={
                <ProviderRoute>
                  {import.meta.env.VITE_ENABLE_ACCOUNTS === 'true'
                    ? <ProviderAccounts />
                    : <Navigate to="/provider/dashboard" replace />}
                </ProviderRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <BuildStamp />
      {!isProviderRoute && !isOnboardingRoute && <Footer />}
    </>
  );
};

const App = () => {
  // Expose Supabase for Manual Verification (Console Snippets)
  useEffect(() => {
    // Expose Supabase for Manual Verification (Console Snippets)
    if (import.meta.env.MODE !== "production" && (import.meta.env.DEV || import.meta.env.VITE_EXPOSE_SUPABASE === "true")) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).supabase = supabase;
    }
  }, []);

  return (
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
};

export default App;
