import React, { createContext, useState, useContext, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, UserRole, Profile, Provider } from '../lib/supabase';
import { ensureProviderMembership } from '@/services/providerMembership';
import { logger } from '@/lib/logger';

interface User {
  id: string;
  email: string;
  role?: UserRole;
  profile?: Profile;
  provider?: Provider;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  provider: Provider | null;
  isAuthenticated: boolean;
  isProvider: boolean;
  isAdmin: boolean;
  isVerified: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  provider: null,
  isAuthenticated: false,
  isProvider: false,
  isAdmin: false,
  isVerified: false,
  loading: true,
  login: async () => { },
  signUp: async () => { },
  logout: async () => { },
  refreshProfile: async () => { },
});

export const useAuth = () => useContext(AuthContext);

const withTimeout = async <T,>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

interface ErrorDetails {
  message: string;
  stack?: string;
  code?: string;
}

const stringifyUnknown = (value: unknown): string => {
  if (typeof value === 'string') {
    return value;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const extractStringCode = (value: unknown): string | undefined => {
  if (typeof value === 'object' && value !== null) {
    const maybeCode = (value as Record<string, unknown>).code;
    if (typeof maybeCode === 'string') {
      return maybeCode;
    }
  }
  return undefined;
};

const getErrorDetails = (error: unknown): ErrorDetails => {
  if (error instanceof Error) {
    const code = extractStringCode(error);

    return {
      message: error.message,
      stack: error.stack,
      code,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const message =
      'message' in error && typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : stringifyUnknown(error);

    const code = extractStringCode(error);

    return { message, code };
  }

  return { message: stringifyUnknown(error) };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'signed_out' | 'signed_in'>('loading');
  const isMountedRef = useRef(true);
  const profileRef = useRef<Profile | null>(null);
  const providerRef = useRef<Provider | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    providerRef.current = provider;
  }, [provider]);

  // Fetch user profile from database
  const fetchUserProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    if (!userId) return null;

    try {
      // Fetch profile with timeout
      const profilePromise = supabase
        .from('profiles')
        .select('*, is_admin, is_verified')
        .eq('user_id', userId)
        .single();

      const { data: profileData, error: profileError } = await withTimeout(
        profilePromise,
        10000, // 10 seconds
        'Profile fetch timeout after 10s'
      );

      if (profileError) {
        logger.error('Profile fetch error', profileError);
        throw profileError;
      }

      const typedProfileData: Profile | null = profileData ? {
        ...profileData,
        role: profileData.role as UserRole,
        is_admin: profileData.is_admin === null ? undefined : profileData.is_admin,
        is_verified: profileData.is_verified === null ? undefined : profileData.is_verified,
        updated_at: profileData.updated_at === null ? undefined : profileData.updated_at,
      } : null;

      logger.debug('Profile fetched', { role: typedProfileData?.role });
      if (!isMountedRef.current) return typedProfileData;
      setProfile(typedProfileData);
      profileRef.current = typedProfileData;

      // If user is an operator/owner/admin, fetch provider data.
      if (typedProfileData?.role && ['provider', 'operator', 'manager', 'admin'].includes(typedProfileData.role)) {
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
          providerRef.current = providerData || null;
        }
      } else {
        if (isMountedRef.current) {
          setProvider(null);
          providerRef.current = null;
        }
      }

      return typedProfileData;
    } catch (error) {
      const details = getErrorDetails(error);
      logger.error('Error fetching user profile', error);

      // Check if it's a RLS policy error
      if (
        details.message.includes('policy') ||
        details.code === '42501'
      ) {
        logger.error('RLS POLICY ERROR - User cannot read profiles table');
      }

      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let subscription: ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription'] | null = null;

    const clearAuthState = () => {
      if (!isMountedRef.current) return;
      setUser(null);
      setProfile(null);
      setProvider(null);
      profileRef.current = null;
      providerRef.current = null;
    };

    const applySession = async (session: Session | null, options?: { forceProfile?: boolean }) => {
      if (!isMountedRef.current) return;

      if (!session?.user) {
        clearAuthState();
        setAuthStatus('signed_out');
        return;
      }

      if (!session.user.email_confirmed_at) {
        await supabase.auth.signOut();
        clearAuthState();
        setAuthStatus('signed_out');
        return;
      }

      if (profileRef.current && profileRef.current.user_id !== session.user.id) {
        setProfile(null);
        profileRef.current = null;
        setProvider(null);
        providerRef.current = null;
      }

      let profileData: Profile | null = profileRef.current;
      if (options?.forceProfile || !profileData) {
        profileData = await fetchUserProfile(session.user.id);
        if (!isMountedRef.current) return;
        if (!profileData) {
          setProfile(null);
          profileRef.current = null;
          setProvider(null);
          providerRef.current = null;
        }
      }

      if (!isMountedRef.current) return;
      setUser({
        id: session.user.id,
        email: session.user.email || '',
        role: profileData?.role,
        profile: profileData || undefined,
      });
      setAuthStatus('signed_in');
    };

    const initializeAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          logger.error('Session fetch error', sessionError);
          clearAuthState();
          setAuthStatus('signed_out');
          return;
        }

        await applySession(session);
        if (!session) {
          setAuthStatus('signed_out');
        }
      } catch (error) {
        logger.error('Error initializing auth', error);
        clearAuthState();
        setAuthStatus('signed_out');
      }
    };

    const { data: authData } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMountedRef.current) return;

      logger.debug('Auth state change', event);

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        // execute asynchronously to not block the auth flow
        applySession(session).catch(err => logger.error('Error applying session', err));
      } else if (event === 'SIGNED_OUT') {
        clearAuthState();
        setAuthStatus('signed_out');
      } else if (event === 'TOKEN_REFRESHED') {
        applySession(session).catch(err => logger.error('Error applying session (refresh)', err));
      } else if (event === 'USER_UPDATED') {
        applySession(session, { forceProfile: true }).catch(err => logger.error('Error applying session (update)', err));
      }
    });

    subscription = authData.subscription;
    initializeAuth();

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchUserProfile]);

  // Login with email and password
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    logger.sensitive('Login attempt for', email); // Only logged in DEV with explicit flag

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logger.error('Auth error', error);
        throw error;
      }

      if (data.user && !data.user.email_confirmed_at) {
        logger.warn('Login blocked - email not confirmed');
        await supabase.auth.signOut();
        throw new Error('Email not confirmed');
      }

      logger.success('Login successful');

      // DO NOT fetch profile here - let onAuthStateChange handle it
      // This prevents duplicate profile fetching and race conditions
    } catch (error) {
      const details = getErrorDetails(error);
      logger.error('Login failed', error);
      throw (error instanceof Error) ? error : new Error(details.message || 'Failed to login');
    }
  }, []);

  // Sign up with email, password and role
  const signUp = useCallback(async (email: string, password: string, role: UserRole): Promise<void> => {
    logger.sensitive('Sign up attempt for', { email, role }); // Only DEV + explicit flag

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role, // This will be used by the database trigger
          },
        },
      });

      if (error) {
        logger.error('Signup error', error);
        throw error;
      }

      if (data.user && data.session) {
        logger.info('Waiting for database trigger to create profile');
        // Profile will be created automatically by database trigger
        // Wait a bit for the trigger to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        logger.debug('Fetching newly created profile');
        const profileData = await fetchUserProfile(data.user.id);
        if (!isMountedRef.current) {
          return;
        }
        setUser({
          id: data.user.id,
          email: data.user.email!,
          role: profileData?.role || role,
          profile: profileData || undefined,
        });
        setAuthStatus('signed_in');
        logger.success('Sign up complete');
      } else {
        logger.info('Sign up completed without active session (email confirmation required)');
        setAuthStatus('signed_out');
      }
    } catch (error) {
      const details = getErrorDetails(error);
      logger.error('Sign up failed', error);
      throw (error instanceof Error) ? error : new Error(details.message || 'Failed to sign up');
    }
  }, [fetchUserProfile]);

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    logger.info('Logout attempt');

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        logger.error('Logout error', error);
        throw error;
      }

      logger.success('Logout successful');
      setUser(null);
      setProfile(null);
      setProvider(null);
      profileRef.current = null;
      providerRef.current = null;
      setAuthStatus('signed_out');
    } catch (error) {
      const details = getErrorDetails(error);
      logger.error('Logout failed', error);
      throw (error instanceof Error) ? error : new Error(details.message || 'Failed to logout');
    }
  }, []);

  // Refresh profile and provider data
  const refreshProfile = useCallback(async (): Promise<void> => {
    logger.info('Refreshing profile data');

    if (!user?.id) {
      logger.warn('Cannot refresh profile - no user logged in');
      return;
    }

    try {
      await fetchUserProfile(user.id);
      logger.success('Profile refreshed successfully');
    } catch (error) {
      const details = getErrorDetails(error);
      logger.error('Profile refresh failed', error);
      throw (error instanceof Error) ? error : new Error(details.message || 'Failed to refresh profile');
    }
  }, [user?.id, fetchUserProfile]);

  const loading = authStatus === 'loading';
  const isAuthenticated = authStatus === 'signed_in' && !!user;

  const value: AuthContextType = useMemo(() => ({
    user,
    profile,
    provider,
    isAuthenticated,
    isProvider: profile?.role === 'provider' || profile?.role === 'operator' || profile?.role === 'manager' || profile?.role === 'admin' || profile?.is_admin === true,
    isAdmin: profile?.role === 'admin' || profile?.is_admin === true,
    isVerified: profile?.is_verified === true,
    loading,
    login,
    signUp,
    logout,
    refreshProfile,
  }), [user, profile, provider, isAuthenticated, loading, login, signUp, logout, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
