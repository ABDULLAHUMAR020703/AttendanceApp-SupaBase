// Session Helper Utilities
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../core/config/supabase';

/**
 * Clear all Supabase session data from AsyncStorage
 * Use this when refresh token errors occur
 */
export const clearSupabaseSession = async () => {
  try {
    // Clear all Supabase-related keys from AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    const supabaseKeys = keys.filter(key => 
      key.includes('supabase') || 
      key.includes('sb-') ||
      key.includes('auth-token')
    );
    
    if (supabaseKeys.length > 0) {
      await AsyncStorage.multiRemove(supabaseKeys);
      console.log('✓ Cleared Supabase session data');
    }
    
    // Also sign out from Supabase
    await supabase.auth.signOut();
    console.log('✓ Signed out from Supabase');
    
    return { success: true };
  } catch (error) {
    console.error('Error clearing Supabase session:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if error is a refresh token error
 */
export const isRefreshTokenError = (error) => {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString() || '';
  return (
    errorMessage.includes('Refresh Token') ||
    errorMessage.includes('refresh_token') ||
    errorMessage.includes('Invalid Refresh Token') ||
    errorMessage.includes('Refresh Token Not Found') ||
    error.code === 'invalid_refresh_token'
  );
};

/**
 * Handle refresh token error by clearing session
 */
export const handleRefreshTokenError = async () => {
  console.log('Handling refresh token error...');
  await clearSupabaseSession();
};

