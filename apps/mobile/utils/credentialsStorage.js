// Credentials Storage Utilities
import AsyncStorage from '@react-native-async-storage/async-storage';

const REMEMBER_ME_KEY = 'remember_me';
const SAVED_USERNAME_KEY = 'saved_username';
const SAVED_PASSWORD_KEY = 'saved_password';

/**
 * Save credentials for "Remember Me" functionality
 * @param {string} username - Username to save
 * @param {string} password - Password to save (optional, for convenience)
 * @returns {Promise<void>}
 */
export const saveCredentials = async (username, password = null) => {
  try {
    await AsyncStorage.setItem(REMEMBER_ME_KEY, 'true');
    await AsyncStorage.setItem(SAVED_USERNAME_KEY, username);
    if (password) {
      await AsyncStorage.setItem(SAVED_PASSWORD_KEY, password);
    }
    console.log('Credentials saved for Remember Me');
  } catch (error) {
    console.error('Error saving credentials:', error);
  }
};

/**
 * Load saved credentials
 * @returns {Promise<{username: string|null, password: string|null, rememberMe: boolean}>}
 */
export const loadCredentials = async () => {
  try {
    const rememberMe = await AsyncStorage.getItem(REMEMBER_ME_KEY);
    const username = await AsyncStorage.getItem(SAVED_USERNAME_KEY);
    const password = await AsyncStorage.getItem(SAVED_PASSWORD_KEY);
    
    return {
      rememberMe: rememberMe === 'true',
      username: username || null,
      password: password || null
    };
  } catch (error) {
    console.error('Error loading credentials:', error);
    return {
      rememberMe: false,
      username: null,
      password: null
    };
  }
};

/**
 * Clear saved credentials
 * @returns {Promise<void>}
 */
export const clearCredentials = async () => {
  try {
    await AsyncStorage.removeItem(REMEMBER_ME_KEY);
    await AsyncStorage.removeItem(SAVED_USERNAME_KEY);
    await AsyncStorage.removeItem(SAVED_PASSWORD_KEY);
    console.log('Credentials cleared');
  } catch (error) {
    console.error('Error clearing credentials:', error);
  }
};

