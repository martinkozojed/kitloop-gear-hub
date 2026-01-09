import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface Props {
  children: JSX.Element;
  allowUnverified?: boolean;
}

const ProviderRoute = ({ children, allowUnverified = false }: Props) => {
  const { isAuthenticated, isProvider, provider, loading, refreshProfile } = useAuth();
  const location = useLocation();

  // Refresh provider data when navigating to provider routes
  useEffect(() => {
    if (isAuthenticated && isProvider && !provider && !loading) {
      console.log('🔄 ProviderRoute: No provider data, refreshing...');
      refreshProfile();
    }
  }, [isAuthenticated, isProvider, provider, loading, refreshProfile]);

  // Show nothing while loading auth state
  if (loading) {
    return null;
  }

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    if (location.pathname.startsWith('/demo')) {
      return <Navigate to="/demo/dashboard" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // Not a provider - redirect to homepage
  if (!isProvider) {
    return <Navigate to="/" replace />;
  }

  // Allow access to setup/verify pages even without provider record
  const isSetupOrVerifyPage = location.pathname.includes('/setup') ||
                               location.pathname.includes('/verify');

  // If on setup/verify page, allow access
  if (isSetupOrVerifyPage || allowUnverified) {
    return children;
  }

  // For other pages, ensure we have a provider record
  if (!provider) {
    console.log('⚠️ No provider record found, redirecting to setup');
    return <Navigate to="/provider/setup" replace />;
  }

  return children;
};

export default ProviderRoute;
