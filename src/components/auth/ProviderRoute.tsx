import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

interface ProviderRouteProps {
  children: React.ReactNode;
}

const ProviderRoute = ({ children }: ProviderRouteProps) => {
  const { user, profile, provider, loading, isProvider, isAdmin } = useAuth();
  const location = useLocation();
  const demoEnabled = import.meta.env.VITE_ENABLE_DEMO === "true";

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

  // All checks passed - render protected route (allow pending providers for faster MVP iteration)
  logger.debug('ProviderRoute: Access granted');
  return <>{children}</>;
};

export default ProviderRoute;
