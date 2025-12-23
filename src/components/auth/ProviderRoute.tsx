import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProviderRouteProps {
  children: React.ReactNode;
}

const ProviderRoute = ({ children }: ProviderRouteProps) => {
  const { user, profile, provider, loading, isProvider, isAdmin } = useAuth();

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
    console.log('🚫 ProviderRoute: No user found, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // Not a provider/admin - redirect to home
  // We use the robust isProvider check from context which includes operators, managers, and admins
  if (!isProvider && !isAdmin) {
    console.log('🚫 ProviderRoute: User is not a provider or admin, redirecting to home');
    return <Navigate to="/" replace />;
  }

  // Missing provider profile - finish onboarding
  if (!provider && !isAdmin) {
    console.log('🚧 ProviderRoute: No provider record, redirecting to setup');
    return <Navigate to="/provider/setup" replace />;
  }

  // Check approval status (only if provider exists - admins bypass this if they don't have a provider profile)
  if (provider && provider.status !== 'approved') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mx-auto w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-xl">⏳</span>
          </div>
          <h2 className="text-2xl font-bold mb-2">Verification Pending</h2>
          <p className="text-muted-foreground mb-6">
            Your provider account is currently under review. access to the dashboard will be granted once an administrator approves your application.
          </p>
          <p className="text-xs text-muted-foreground">
            Status: <span className="font-mono font-medium">{provider.status || 'pending'}</span>
          </p>
        </div>
      </div>
    );
  }

  // All checks passed - render protected route
  console.log('✅ ProviderRoute: Access granted');
  return <>{children}</>;
};

export default ProviderRoute;
