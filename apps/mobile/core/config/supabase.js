// Supabase Configuration
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Note: Using AsyncStorage for session persistence (expo-secure-store is optional)

// Get Supabase credentials from environment variables
// These should be set in apps/mobile/.env with EXPO_PUBLIC_ prefix
// For EAS builds, set these as secrets: eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value <your-url>
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// In production builds, environment variables might not be available at build time
// Check if we're in development mode
const isDevelopment = __DEV__;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = '✗ Missing Supabase environment variables\n' +
    'Please ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set.\n' +
    'For local development: Set in apps/mobile/.env\n' +
    'For EAS builds: Set as secrets using: eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value <your-url>';
  
  console.error(errorMessage);
  
  // In production, don't throw immediately - allow app to show error screen
  // In development, throw to catch issues early
  if (isDevelopment) {
    throw new Error('Supabase configuration missing');
  } else {
    // Log error but continue - the app will show an error screen
    console.error('Supabase configuration missing in production build');
  }
}

// Custom storage adapter for React Native
// Uses AsyncStorage for session persistence
const AsyncStorageAdapter = {
  getItem: async (key) => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Error getting item from AsyncStorage:', error);
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.error('Error setting item in AsyncStorage:', error);
    }
  },
  removeItem: async (key) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing item from AsyncStorage:', error);
    }
  },
};

// Create Supabase client
// Use placeholder values if env vars are missing (for production builds without secrets)
const finalSupabaseUrl = supabaseUrl || 'https://placeholder.supabase.co';
const finalSupabaseAnonKey = supabaseAnonKey || 'placeholder-key';

const supabase = createClient(finalSupabaseUrl, finalSupabaseAnonKey, {
  auth: {
    storage: AsyncStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // React Native doesn't use URLs
    // Handle token refresh errors gracefully
    flowType: 'pkce', // Use PKCE flow for better security
  },
  // Global error handler for auth errors
  global: {
    headers: {
      'x-client-info': 'hadir-ai-mobile',
    },
  },
});

// Add global error handler for refresh token errors
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('✓ Token refreshed successfully');
  } else if (event === 'SIGNED_OUT') {
    console.log('✓ User signed out');
  } else if (event === 'SIGNED_IN' && session) {
    console.log('✓ User signed in');
  }
});

if (supabaseUrl && supabaseAnonKey) {
  console.log('✓ Supabase client initialized successfully');
} else {
  console.warn('⚠ Supabase client initialized with placeholder values - environment variables missing');
  console.warn('⚠ The app may not function correctly. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

export { supabase, supabaseUrl };

