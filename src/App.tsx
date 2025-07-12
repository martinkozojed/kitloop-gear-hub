
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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
import ProviderRoute from "./components/ProviderRoute";
import DashboardOverview from "./pages/provider/DashboardOverview";
import ProviderGear from "./pages/provider/ProviderGear";
import ProviderReservations from "./pages/provider/ProviderReservations";
import ProviderVerify from "./pages/provider/ProviderVerify";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navbar />
          <main className="min-h-screen pt-16">
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
              <Route
                path="/provider/dashboard"
                element={
                  <ProviderRoute>
                    <DashboardOverview />
                  </ProviderRoute>
                }
              />
              <Route
                path="/provider/dashboard/gear"
                element={
                  <ProviderRoute>
                    <ProviderGear />
                  </ProviderRoute>
                }
              />
              <Route
                path="/provider/dashboard/reservations"
                element={
                  <ProviderRoute>
                    <ProviderReservations />
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
          <Footer />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
