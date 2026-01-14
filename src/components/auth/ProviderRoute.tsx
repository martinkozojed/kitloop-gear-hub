import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2, AlertTriangle, Mail } from 'lucide-react';
import { Button } from '../ui/button';
import { logger } from '@/lib/logger';

interface ProviderRouteProps {
  children: React.ReactNode;
}

const ProviderRoute = ({ children }: ProviderRouteProps) => {
  const { user, profile, provider, loading, isProvider, isAdmin } = useAuth();
  const location = useLocation();
  const demoEnabled = import.meta.env.VITE_ENABLE_DEMO === "true";

  const PendingOverlay = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-[2px] px-4">
      <div className="relative max-w-lg w-full">
        <div className="absolute -inset-2 rounded-3xl bg-gradient-to-b from-amber-200/70 via-amber-100/40 to-emerald-200/70 blur-xl opacity-80 pointer-events-none" />
        <div className="relative bg-white/85 rounded-2xl p-8 text-center space-y-4 shadow-lg border border-white/60">
          <div className="mx-auto h-14 w-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">Waiting for approval</h2>
            <p className="text-muted-foreground">
              Your provider account is pending review. You can explore the workspace, but all actions stay locked until an admin approves your application.
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => (window.location.href = "/")}>Go to homepage</Button>
            <Button variant="secondary" onClick={() => (window.location.href = "mailto:support@kitloop.cz?subject=Provider%20approval")}>
              <Mail className="h-4 w-4 mr-1" />
              Contact support
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-green-600" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in - redirect to login
  if (!user) {
    logger.debug('ProviderRoute: No user found, redirecting to login');
    if (location.pathname.startsWith('/demo')) {
      if (!demoEnabled) {
        return <Navigate to="/" replace />;
      }
      return <Navigate to="/demo/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // Not a provider/admin - redirect to home
  // We use the robust isProvider check from context which includes operators, managers, and admins
  if (!isProvider && !isAdmin) {
    logger.debug('ProviderRoute: User is not a provider or admin, redirecting to home');
    return <Navigate to="/" replace />;
  }

  // Missing provider profile - finish onboarding
  if (!provider && !isAdmin) {
    logger.debug('ProviderRoute: No provider record, redirecting to setup');
    return <Navigate to="/provider/setup" replace />;
  }

  // If pending, render the page but lock interactions with overlay
  if (!isAdmin && provider && provider.status !== 'approved') {
    logger.debug('ProviderRoute: Provider pending approval, showing overlay');
    return (
      <>
        {children}
        <PendingOverlay />
      </>
    );
  }

  logger.debug('ProviderRoute: Access granted');
  return <>{children}</>;
};

export default ProviderRoute;
