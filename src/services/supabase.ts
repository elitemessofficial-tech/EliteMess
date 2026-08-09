import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gsxjmptksflmyefzmuvg.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_G5jCit2kMovhgYL7ykjSuA_x2rtX_D1';

// SSR-Safe Custom Storage adapter for Expo Web/SSR pre-rendering in Node.js
const customStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') {
        return null;
      }
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') {
        return;
      }
      try {
        window.localStorage.setItem(key, value);
      } catch {}
      return;
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') {
        return;
      }
      try {
        window.localStorage.removeItem(key);
      } catch {}
      return;
    }
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Helper to update Supabase authorization header when authentication shifts 
 * to Firebase. If you sign in with Firebase Phone Auth, your custom JWT generator
 * should sign a token with Supabase's JWT secret, containing custom claims:
 * { "sub": "firebase_uid", "role": "rider" | "owner" | "customer", "branch_id": "uuid" }
 * 
 * You pass that custom JWT to the client to satisfy RLS policies.
 */
export const setSupabaseCustomToken = async (customJwt: string) => {
  const { error } = await supabase.auth.setSession({
    access_token: customJwt,
    refresh_token: '', // No refresh token needed since Firebase handles rotation client-side
  });
  
  if (error) {
    console.error('Error setting custom Supabase token session:', error.message);
    throw error;
  }
};
