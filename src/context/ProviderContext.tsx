import React, { createContext, useState, useContext, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase, Provider } from '../lib/supabase';
import { ensureProviderMembership } from '@/services/providerMembership';
import { useAuth } from './AuthContext';
import { logger } from '@/lib/logger';

interface ProviderContextType {
  provider: Provider | null;
  isProvider: boolean;
  loading: boolean;
  refreshProvider: () => Promise<void>;
}

const ProviderContext = createContext<ProviderContextType>({
  provider: null,
  isProvider: false,
  loading: true,
  refreshProvider: async () => {},
});

export const useProvider = () => useContext(ProviderContext);

export const ProviderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, loading: authLoading } = useAuth();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [providerLoading, setProviderLoading] = useState(true);
  const isMountedRef = useRef(true);
  const lastFetchedUserId = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchProvider = useCallback(async (userId: string): Promise<void> => {
    // Primary: ownership via providers.user_id (owner)
    const { data: ownedProvider, error: ownedError } = await supabase
      .from('providers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (ownedError) {
      logger.warn('Owned provider fetch error', ownedError);
    }

    let providerData = ownedProvider as Provider | null;

    // Fallback: membership mapping (for legacy/staff)
    if (!providerData) {
      const { data: membershipData, error: membershipError } = await supabase
        .from('user_provider_memberships')
        .select('provider:providers!inner(*)')
        .eq('user_id', userId)
        .maybeSingle();

      if (membershipError) logger.warn('Membership fetch error', membershipError);
      providerData = membershipData?.provider as unknown as Provider | null;
    }

    if (providerData) {
      // Only enforce membership when the user owns this provider record.
      if (providerData.user_id === userId) {
        await ensureProviderMembership(userId, providerData.id, 'owner');
      }
    }

    if (isMountedRef.current) {
      setProvider(providerData || null);
    }
  }, []);

  // React to auth changes: fetch provider when user/profile are ready
  useEffect(() => {
    if (authLoading) return;

    // No user or no profile → clear provider
    if (!user?.id || !profile) {
      setProvider(null);
      setProviderLoading(false);
      lastFetchedUserId.current = null;
      return;
    }

    // Only provider-capable roles need provider data
    const isProviderRole = ['provider', 'operator', 'manager', 'admin'].includes(profile.role);
    if (!isProviderRole) {
      setProvider(null);
      setProviderLoading(false);
      lastFetchedUserId.current = user.id;
      return;
    }

    // Skip if we already fetched for this user
    if (lastFetchedUserId.current === user.id) return;
    lastFetchedUserId.current = user.id;

    setProviderLoading(true);
    fetchProvider(user.id)
      .catch((err) => logger.error('Provider fetch failed', err))
      .finally(() => {
        if (isMountedRef.current) setProviderLoading(false);
      });
  }, [user?.id, profile, authLoading, fetchProvider]);

  const refreshProvider = useCallback(async (): Promise<void> => {
    if (!user?.id) {
      logger.warn('Cannot refresh provider - no user logged in');
      return;
    }
    setProviderLoading(true);
    try {
      await fetchProvider(user.id);
    } finally {
      if (isMountedRef.current) setProviderLoading(false);
    }
  }, [user?.id, fetchProvider]);

  const isProvider = !!(
    profile?.role === 'provider' ||
    profile?.role === 'operator' ||
    profile?.role === 'manager' ||
    profile?.role === 'admin' ||
    profile?.is_admin === true
  );

  const value: ProviderContextType = useMemo(() => ({
    provider,
    isProvider,
    loading: providerLoading,
    refreshProvider,
  }), [provider, isProvider, providerLoading, refreshProvider]);

  return (
    <ProviderContext.Provider value={value}>
      {children}
    </ProviderContext.Provider>
  );
};
