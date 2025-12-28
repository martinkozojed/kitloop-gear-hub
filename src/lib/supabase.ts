import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

// Create Supabase client with Safari-compatible storage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'kitloop-auth-token',
    // Safari fix: Use polling for session refresh when tab visibility changes
    flowType: 'pkce'
  }
});

// Database types for type safety
export type UserRole = 'customer' | 'provider' | 'admin' | 'operator' | 'manager';

export interface Profile {
  user_id: string;
  role: UserRole;
  is_admin?: boolean;
  is_verified?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Provider {
  id: string;
  user_id: string;
  rental_name: string;
  status: string;
  verified: boolean;
  created_at: string;
  updated_at?: string;
  company_id?: string | null;
  address?: string | null;
  location?: string | null;
  country?: string | null;
  phone?: string | null;
  website?: string | null;
  email?: string | null;
  currency?: string | null;
  time_zone?: string | null;
  contact_name?: string | null;
  seasonal_mode?: boolean | null;
  onboarding_completed?: boolean | null;
  onboarding_step?: number | null;
  current_season?: string | null;
  tax_id?: string | null;
  terms_text?: string | null;
}
