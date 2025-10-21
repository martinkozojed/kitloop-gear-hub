import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProviderRouteProps {
  children: React.ReactNode;
}

const ProviderRoute = ({ children }: ProviderRouteProps) => {
  const { user, profile, provider, loading } = useAuth();

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

  // Not a provider - redirect to home
  if (profile?.role !== 'provider') {
    console.log('🚫 ProviderRoute: User is not a provider, redirecting to home');
    return <Navigate to="/" replace />;
  }

  // Missing provider profile - finish onboarding
  if (!provider) {
    console.log('🚧 ProviderRoute: No provider record, redirecting to setup');
    return <Navigate to="/provider/setup" replace />;
  }

  // All checks passed - render protected route
  console.log('✅ ProviderRoute: Access granted');
  return <>{children}</>;
};

export default ProviderRoute;
