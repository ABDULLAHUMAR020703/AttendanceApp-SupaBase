// Authentication Preferences Utility
// Stores employee's preferred authentication method (face verification or fingerprint)
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_PREFERENCE_KEY = '@auth_preference';

/**
 * Get employee's preferred authentication method
 * @param {string} username - Username
 * @returns {Promise<'face' | 'biometric' | null>} - Preferred method or null if not set
 */
export const getAuthPreference = async (username) => {
  try {
    const key = `${AUTH_PREFERENCE_KEY}_${username}`;
    const preference = await AsyncStorage.getItem(key);
    return preference ? preference : null; // 'face' or 'biometric'
  } catch (error) {
    console.error('Error getting auth preference:', error);
    return null;
  }
};

/**
 * Set employee's preferred authentication method
 * @param {string} username - Username
 * @param {string} method - 'face' or 'biometric'
 * @returns {Promise<boolean>} - Success status
 */
export const setAuthPreference = async (username, method) => {
  try {
    if (method !== 'face' && method !== 'biometric') {
      throw new Error('Invalid auth method. Must be "face" or "biometric"');
    }
    
    const key = `${AUTH_PREFERENCE_KEY}_${username}`;
    await AsyncStorage.setItem(key, method);
    console.log(`Auth preference set for ${username}: ${method}`);
    return true;
  } catch (error) {
    console.error('Error setting auth preference:', error);
    return false;
  }
};

/**
 * Clear employee's authentication preference
 * @param {string} username - Username
 * @returns {Promise<boolean>} - Success status
 */
export const clearAuthPreference = async (username) => {
  try {
    const key = `${AUTH_PREFERENCE_KEY}_${username}`;
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error('Error clearing auth preference:', error);
    return false;
  }
};

/**
 * Get the authentication method to use based on preference and availability
 * @param {string} username - Username
 * @param {boolean} biometricAvailable - Whether biometric is available on device
 * @returns {Promise<'face' | 'biometric'>} - Method to use
 */
export const getPreferredAuthMethod = async (username, biometricAvailable) => {
  try {
    // Get user preference
    const preference = await getAuthPreference(username);
    
    // If user prefers biometric but it's not available, fall back to face
    if (preference === 'biometric' && !biometricAvailable) {
      console.log('Biometric not available, falling back to face verification');
      return 'face';
    }
    
    // If user prefers face, use face
    if (preference === 'face') {
      return 'face';
    }
    
    // If user prefers biometric and it's available, use biometric
    if (preference === 'biometric' && biometricAvailable) {
      return 'biometric';
    }
    
    // If no preference set, default to biometric if available, otherwise face
    return biometricAvailable ? 'biometric' : 'face';
  } catch (error) {
    console.error('Error getting preferred auth method:', error);
    return biometricAvailable ? 'biometric' : 'face';
  }
};


















