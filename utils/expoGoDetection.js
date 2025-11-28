// Detect if running in Expo Go
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Check if app is running in Expo Go
 * @returns {boolean}
 */
export const isExpoGo = () => {
  try {
    // Check if running in Expo Go
    // Expo Go has a specific manifest and appOwnership
    return (
      Constants.appOwnership === 'expo' ||
      Constants.executionEnvironment === 'standalone' === false ||
      !Constants.expoConfig
    );
  } catch (error) {
    // If we can't determine, assume Expo Go for safety
    return true;
  }
};

/**
 * Check if running on Android
 * @returns {boolean}
 */
export const isAndroid = () => {
  return Platform.OS === 'android';
};

/**
 * Check if biometric should be disabled (Android Expo Go)
 * @returns {boolean}
 */
export const shouldDisableBiometric = () => {
  return isExpoGo() && isAndroid();
};


















