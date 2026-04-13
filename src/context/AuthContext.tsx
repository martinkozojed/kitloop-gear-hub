import React, { createContext, useState, useContext, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, UserRole, Profile } from '../lib/supabase';
import { logger } from '@/lib/logger';

interface User {
  id: string;
  email: string;
  role?: UserRole;
  profile?: Profile;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAuthenticated: boolean;
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
  isAuthenticated: false,
  isAdmin: false,
  isVerified: false,
  loading: true,
  login: async () => {},
  signUp: async () => {},
  logout: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const withTimeout = async <T,>(
  promise: PromiseLike<T>,
  timeoutMs: number,
  timeoutMessage: string,
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
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const extractStringCode = (value: unknown): string | undefined => {
  if (typeof value === 'object' && value !== null) {
    const maybeCode = (value as Record<string, unknown>).code;
    if (typeof maybeCode === 'string') return maybeCode;
  }
  return undefined;
};

const getErrorDetails = (error: unknown): ErrorDetails => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      code: extractStringCode(error),
    };
  }

  if (typeof error === 'object' && error !== null) {
    const message =
      'message' in error && typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : stringifyUnknown(error);
    return { message, code: extractStringCode(error) };
  }

  return { message: stringifyUnknown(error) };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'signed_out' | 'signed_in'>('loading');
  const isMountedRef = useRef(true);
  const profileRef = useRef<Profile | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  // Fetch user profile from database (identity only — no provider logic)
  const fetchUserProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    if (!userId) return null;

    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, is_admin, is_verified')
        .eq('user_id', userId)
        .single();

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

      return typedProfileData;
    } catch (error) {
      const details = getErrorDetails(error);
      logger.error('Error fetching user profile', error);

      if (details.message.includes('policy') || details.code === '42501') {
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
      profileRef.current = null;
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
      }

      let profileData: Profile | null = profileRef.current;
      if (options?.forceProfile || !profileData) {
        profileData = await fetchUserProfile(session.user.id);
        if (!isMountedRef.current) return;
        if (!profileData) {
          setProfile(null);
          profileRef.current = null;
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

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    logger.sensitive('Login attempt for', email);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

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
    } catch (error) {
      const details = getErrorDetails(error);
      logger.error('Login failed', error);
      throw (error instanceof Error) ? error : new Error(details.message || 'Failed to login');
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, role: UserRole): Promise<void> => {
    logger.sensitive('Sign up attempt for', { email, role });

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role } },
      });

      if (error) {
        logger.error('Signup error', error);
        throw error;
      }

      if (data.user && data.session) {
        logger.info('Waiting for database trigger to create profile');
        await new Promise(resolve => setTimeout(resolve, 1000));

        logger.debug('Fetching newly created profile');
        const profileData = await fetchUserProfile(data.user.id);
        if (!isMountedRef.current) return;
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
      profileRef.current = null;
      setAuthStatus('signed_out');
    } catch (error) {
      const details = getErrorDetails(error);
      logger.error('Logout failed', error);
      throw (error instanceof Error) ? error : new Error(details.message || 'Failed to logout');
    }
  }, []);

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
    isAuthenticated,
    isAdmin: profile?.role === 'admin' || profile?.is_admin === true,
    isVerified: profile?.is_verified === true,
    loading,
    login,
    signUp,
    logout,
    refreshProfile,
  }), [user, profile, isAuthenticated, loading, login, signUp, logout, refreshProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
