import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

interface Props {
  children: JSX.Element;
}

const ProviderRoute = ({ children }: Props) => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || user?.role !== 'provider' || !user?.approved) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProviderRoute;
