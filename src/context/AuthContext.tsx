import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase, UserRole, Profile, Provider } from '../lib/supabase';
import { ensureProviderMembership } from '@/services/providerMembership';

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
  const [loading, setLoading] = useState(true);

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string): Promise<Profile | null> => {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    console.log(`[${timestamp}] 📝 fetchUserProfile START for user:`, userId);

    try {
      // Fetch profile with timeout
      console.log(`[${timestamp}] 🔍 Querying profiles table...`);

      const profilePromise = supabase
        .from('profiles')
        .select('*, is_admin, is_verified')
        .eq('user_id', userId)
        .single();

      const { data: profileData, error: profileError } = await withTimeout(
        profilePromise,
        30000,
        'Profile fetch timeout after 30s'
      );

      if (profileError) {
        console.error(`[${timestamp}] ❌ Profile fetch error:`, profileError);
        console.error(`[${timestamp}] ❌ Error details:`, JSON.stringify(profileError, null, 2));
        throw profileError;
      }

      console.log(`[${timestamp}] ✅ Profile fetched:`, { role: profileData?.role, user_id: profileData?.user_id });
      setProfile(profileData);

      // If user is a provider, fetch provider data
      if (profileData?.role === 'provider') {
        console.log(`[${timestamp}] 👤 User is provider, fetching provider data...`);

        const providerPromise = supabase
          .from('providers')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        const { data: providerData, error: providerError } = await withTimeout(
          providerPromise,
          30000,
          'Provider fetch timeout after 30s'
        );

        if (providerError && providerError.code !== 'PGRST116') {
          console.warn(`[${timestamp}] ⚠️ Provider fetch error:`, providerError);
        }

        if (providerData) {
          console.log(`[${timestamp}] ✅ Provider data fetched:`, { id: providerData.id, rental_name: providerData.rental_name });
          await ensureProviderMembership(userId, providerData.id, 'owner');
        } else {
          console.log(`[${timestamp}] ℹ️ No provider record found`);
        }
        setProvider(providerData || null);
      } else {
        console.log(`[${timestamp}] ℹ️ User is not a provider, clearing provider state`);
        setProvider(null);
      }

      console.log(`[${timestamp}] 📝 fetchUserProfile END`);
      return profileData;
    } catch (error) {
      const details = getErrorDetails(error);
      console.error(`[${timestamp}] 💥 Error fetching user profile:`, error);
      console.error(`[${timestamp}] 💥 Error message:`, details.message);
      if (details.stack) {
        console.error(`[${timestamp}] 💥 Error stack:`, details.stack);
      }

      // Check if it's a RLS policy error
      if (
        details.message.includes('policy') ||
        details.code === '42501'
      ) {
        console.error(`[${timestamp}] 🚨 RLS POLICY ERROR - User cannot read profiles table!`);
      }

      return null;
    }
  };

  // Initialize auth state
  useEffect(() => {
    console.log('🔧 Initializing auth...');
    let isMounted = true;
    let subscription: ReturnType<typeof supabase.auth.onAuthStateChange>['data']['subscription'] | null = null;
    let lastProcessedUserId: string | null = null; // Track last processed user to prevent duplicates
    let isProcessing = false; // Prevent concurrent profile fetches

    // Get initial session
    const initializeAuth = async () => {
      try {
        console.log('🔍 Checking for existing session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('❌ Session fetch error:', sessionError);
          if (isMounted) setLoading(false);
          return;
        }

        if (session?.user && isMounted) {
          if (!session.user.email_confirmed_at) {
            console.warn('❗ Email not verified, signing out session');
            await supabase.auth.signOut();
            if (isMounted) {
              setLoading(false);
            }
            return;
          }
          console.log('📦 Existing session found:', session.user.email);
          lastProcessedUserId = session.user.id;
          isProcessing = true;
          const profileData = await fetchUserProfile(session.user.id);
          isProcessing = false;
          if (isMounted) {
            setUser({
              id: session.user.id,
              email: session.user.email!,
              role: profileData?.role,
              profile: profileData || undefined,
            });
            console.log('✅ Auth initialized with existing session');
          }
        } else if (isMounted) {
          console.log('ℹ️ No existing session found');
        }
      } catch (error) {
        console.error('💥 Error initializing auth:', error);
        isProcessing = false;
      } finally {
        if (isMounted) {
          setLoading(false);
          console.log('🏁 Auth initialization complete');
        }
      }
    };

    // Setup auth listener (AFTER init completes)
    const setupAuthListener = () => {
      console.log('👂 Setting up auth state listener...');
      const { data: authData } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!isMounted) {
            console.log('⚠️ Component unmounted, ignoring auth event:', event);
            return;
          }

          console.log('🔔 Auth state changed:', event, session?.user?.email || 'no user');

          // Skip INITIAL_SESSION - already handled in initializeAuth
          if (event === 'INITIAL_SESSION') {
            console.log('⏭️ Skipping INITIAL_SESSION (already handled in init)');
            return;
          }

          if (event === 'SIGNED_IN' && session?.user) {
            // Deduplicate: skip if we just processed this user
            if (session.user.id === lastProcessedUserId || isProcessing) {
              console.log('⏭️ Skipping duplicate SIGNED_IN event (user already processed)');
              return;
            }

            if (!session.user.email_confirmed_at) {
              console.warn('❗ SIGNED_IN but email not verified, signing out');
              await supabase.auth.signOut();
              return;
            }

            console.log('🎉 SIGNED_IN event detected');
            lastProcessedUserId = session.user.id;
            isProcessing = true;
            const profileData = await fetchUserProfile(session.user.id);
            isProcessing = false;
            if (isMounted) {
              setUser({
                id: session.user.id,
                email: session.user.email!,
                role: profileData?.role,
                profile: profileData || undefined,
              });
              console.log('✅ User state updated after SIGNED_IN');
            }
          } else if (event === 'SIGNED_OUT') {
            console.log('👋 SIGNED_OUT event detected');
            if (isMounted) {
              setUser(null);
              setProfile(null);
              setProvider(null);
              lastProcessedUserId = null;
            }
          } else if (event === 'TOKEN_REFRESHED') {
            console.log('🔄 TOKEN_REFRESHED (no action needed)');
            // Don't fetch profile again - session is still valid
          } else if (event === 'USER_UPDATED' && session?.user) {
            console.log('🔄 USER_UPDATED event detected');
            if (isProcessing) {
              console.log('⏭️ Skipping USER_UPDATED - fetch already in progress');
              return;
            }
            isProcessing = true;
            const profileData = await fetchUserProfile(session.user.id);
            isProcessing = false;
            if (isMounted) {
              setUser({
                id: session.user.id,
                email: session.user.email!,
                role: profileData?.role,
                profile: profileData || undefined,
              });
            }
          }
          if (isMounted) {
            setLoading(false);
          }
        }
      );

      subscription = authData.subscription;
    };

    // CRITICAL: Run initialization FIRST, THEN setup listener
    // This prevents race condition where listener catches INITIAL_SESSION before init completes
    (async () => {
      await initializeAuth();
      if (isMounted) {
        setupAuthListener();
      }
    })();

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up auth listener');
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []); // Empty dependency array is correct here - only run once on mount

  // Login with email and password
  const login = async (email: string, password: string): Promise<void> => {
    console.log('🔐 Login attempt for:', email);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('📡 Supabase auth response:', { user: data?.user?.email, error });

      if (error) {
        console.error('❌ Auth error:', error);
        throw error;
      }

      if (data.user && !data.user.email_confirmed_at) {
        console.warn('❗ Login blocked - email not confirmed');
        await supabase.auth.signOut();
        throw new Error('Email not confirmed');
      }

      console.log('✅ Login successful! Auth state change will handle profile fetch.');

      // DO NOT fetch profile here - let onAuthStateChange handle it
      // This prevents duplicate profile fetching and race conditions
    } catch (error) {
      const details = getErrorDetails(error);
      console.error('💥 Login failed:', error);
      throw (error instanceof Error) ? error : new Error(details.message || 'Failed to login');
    }
  };

  // Sign up with email, password and role
  const signUp = async (email: string, password: string, role: UserRole): Promise<void> => {
    console.log('📝 Sign up attempt for:', email, 'with role:', role);

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

      console.log('📡 Supabase signup response:', { user: data?.user?.email, error });

      if (error) {
        console.error('❌ Signup error:', error);
        throw error;
      }

      if (data.user) {
        console.log('⏳ Waiting for database trigger to create profile...');
        // Profile will be created automatically by database trigger
        // Wait a bit for the trigger to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('📝 Fetching newly created profile...');
        const profileData = await fetchUserProfile(data.user.id);
        setUser({
          id: data.user.id,
          email: data.user.email!,
          role: profileData?.role || role,
          profile: profileData || undefined,
        });
        console.log('✅ Sign up complete!');
      }
    } catch (error) {
      const details = getErrorDetails(error);
      console.error('💥 Sign up failed:', error);
      throw (error instanceof Error) ? error : new Error(details.message || 'Failed to sign up');
    }
  };

  // Logout
  const logout = async (): Promise<void> => {
    console.log('🚪 Logout attempt');

    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Logout error:', error);
        throw error;
      }

      console.log('✅ Logout successful');
      setUser(null);
      setProfile(null);
      setProvider(null);
    } catch (error) {
      const details = getErrorDetails(error);
      console.error('💥 Logout failed:', error);
      throw (error instanceof Error) ? error : new Error(details.message || 'Failed to logout');
    }
  };

  // Refresh profile and provider data
  const refreshProfile = async (): Promise<void> => {
    console.log('🔄 Refreshing profile data...');

    if (!user?.id) {
      console.warn('⚠️ Cannot refresh profile - no user logged in');
      return;
    }

    try {
      await fetchUserProfile(user.id);
      console.log('✅ Profile refreshed successfully');
    } catch (error) {
      const details = getErrorDetails(error);
      console.error('💥 Profile refresh failed:', error);
      throw (error instanceof Error) ? error : new Error(details.message || 'Failed to refresh profile');
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    provider,
    isAuthenticated: !!user,
    isProvider: profile?.role === 'provider' || profile?.role === 'operator' || profile?.role === 'manager' || profile?.role === 'admin' || profile?.is_admin === true,
    isAdmin: profile?.role === 'admin' || profile?.is_admin === true,
    isVerified: profile?.is_verified === true,
    loading,
    login,
    signUp,
    logout,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
