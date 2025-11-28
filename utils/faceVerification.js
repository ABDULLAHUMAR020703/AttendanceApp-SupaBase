// Device-based Face Recognition using expo-local-authentication
// Similar to fingerprint authentication - uses device's native Face ID/Face Unlock
import { Platform } from 'react-native';

let LocalAuthentication = null;

// Lazy load the module to prevent crashes
const getLocalAuthentication = async () => {
  if (LocalAuthentication === null) {
    try {
      const module = await Promise.resolve(import('expo-local-authentication'));
      LocalAuthentication = module.default || module;
      return LocalAuthentication;
    } catch (error) {
      console.warn('expo-local-authentication not available:', error.message);
      return null;
    }
  }
  return LocalAuthentication.default || LocalAuthentication;
};

/**
 * Check if device-based face recognition is available
 * @returns {Promise<{available: boolean, error?: string}>}
 */
export const checkFaceRecognitionAvailability = async () => {
  try {
    const LocalAuth = await getLocalAuthentication();
    if (!LocalAuth) {
      return {
        available: false,
        error: 'Face recognition module not available'
      };
    }
    
    const hasHardware = await LocalAuth.hasHardwareAsync();
    if (!hasHardware) {
      return {
        available: false,
        error: 'Face recognition hardware is not available on this device. This device does not support Face ID.'
      };
    }

    const isEnrolled = await LocalAuth.isEnrolledAsync();
    if (!isEnrolled) {
      return {
        available: false,
        error: 'Face ID is not enrolled. Please set up Face ID/Face Unlock in device settings:\n\n• iOS: Settings > Face ID & Passcode > Set Up Face ID\n• Android: Settings > Security > Face unlock\n\nAfter setting up Face ID, return to this app.'
      };
    }

    const supportedTypes = await LocalAuth.supportedAuthenticationTypesAsync();
    const hasFaceRecognition = supportedTypes.includes(LocalAuth.AuthenticationType.FACIAL_RECOGNITION);
    
    if (!hasFaceRecognition) {
      return {
        available: false,
        error: 'Face recognition is not supported on this device. Please use fingerprint authentication instead.'
      };
    }
    
    return {
      available: true,
      error: null
    };
  } catch (error) {
    console.error('Error checking face recognition availability:', error);
    return {
      available: false,
      error: `Error checking Face ID: ${error.message}`
    };
  }
};

/**
 * Verify face using device's native face recognition (Face ID/Face Unlock)
 * @param {string} username - Username (for logging purposes)
 * @param {string} promptMessage - Custom prompt message (optional)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const verifyFace = async (username, promptMessage = 'Authenticate with Face ID to continue') => {
  try {
    const LocalAuth = await getLocalAuthentication();
    if (!LocalAuth) {
        return {
          success: false,
        error: 'Face recognition module not available'
        };
    }

    // Check availability first
    const availability = await checkFaceRecognitionAvailability();
    if (!availability.available) {
        return {
          success: false,
        error: availability.error || 'Face recognition not available. Please ensure Face ID is set up in your device settings.'
      };
    }

    // Double-check enrollment before attempting authentication
    const isEnrolled = await LocalAuth.isEnrolledAsync();
    if (!isEnrolled) {
      return {
        success: false,
        error: 'Face ID is not enrolled on this device. Please set up Face ID in your device settings first.'
      };
    }

    // Get supported authentication types
    const supportedTypes = await LocalAuth.supportedAuthenticationTypesAsync();
    const hasFaceID = supportedTypes.includes(LocalAuth.AuthenticationType.FACIAL_RECOGNITION);
    
    if (!hasFaceID) {
      return {
        success: false,
        error: 'Face ID is not supported on this device. Please use fingerprint authentication instead.'
      };
    }

    // Attempt face recognition authentication
    // IMPORTANT: On iOS, even with disableDeviceFallback: true, the system may still show passcode
    // in certain scenarios (after restart, 48h inactivity, 5 failed attempts, etc.)
    // This is a system security feature and cannot be bypassed
    const authOptions = {
      promptMessage: promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: true, // Try to force Face ID only - no passcode fallback button
    };

    // On iOS, we can also specify to only use Face ID
    if (Platform.OS === 'ios') {
      authOptions.requireConfirmation = false;
      // Note: iOS may still require passcode in certain security scenarios
      // This is normal iOS behavior and cannot be disabled
    }

    const result = await LocalAuth.authenticateAsync(authOptions);

    if (result.success) {
      return {
        success: true,
        error: null
      };
    } else {
      let errorMessage = 'Face recognition cancelled';
      
      if (result.error === 'user_cancel') {
        errorMessage = 'Face recognition cancelled by user';
      } else if (result.error === 'user_fallback') {
        // This shouldn't happen with disableDeviceFallback: true, but if it does, explain why
        errorMessage = 'Face ID authentication failed. Your device may require a passcode in certain security scenarios (after restart, extended inactivity, or multiple failed attempts). This is normal iOS security behavior.';
      } else if (result.error === 'system_cancel') {
        errorMessage = 'Face recognition cancelled by system. Please try again.';
      } else if (result.error === 'not_available') {
        errorMessage = 'Face recognition not available. Please ensure Face ID is set up in device settings.';
      } else if (result.error === 'not_enrolled') {
        errorMessage = 'Face ID is not enrolled. Please set up Face ID in your device settings:\n\nSettings > Face ID & Passcode (iOS)\nSettings > Security > Face unlock (Android)';
      } else if (result.error === 'passcode_not_set') {
        errorMessage = 'Device passcode is required for Face ID. Please set up a passcode in device settings first.';
      } else {
        errorMessage = result.error || 'Face recognition failed. Please try again.';
      }

    return {
        success: false,
        error: errorMessage
    };
    }
  } catch (error) {
    console.error('Error during face recognition:', error);
    return {
      success: false,
      error: `Face recognition error: ${error.message}`
    };
  }
};

// Legacy functions for backward compatibility (no-op or simplified)
/**
 * Initialize face API - no longer needed for device-based recognition
 * @returns {Promise<boolean>}
 */
export const initializeFaceAPI = async () => {
  console.log('Using device-based face recognition - no initialization needed');
  return true;
};

/**
 * Load reference face - no longer needed for device-based recognition
 * @param {string} username - Username
 * @returns {Promise<boolean>}
 */
export const loadReferenceFace = async (username) => {
  console.log('Using device-based face recognition - no reference image needed');
  return true;
};

/**
 * Check if models are loaded - always true for device-based recognition
 * @returns {boolean}
 */
export const areModelsLoaded = () => {
  return true; // Always "loaded" since we use device native
};

/**
 * Clear reference faces - no-op for device-based recognition
 */
export const clearReferenceFaces = () => {
  // No-op for device-based recognition
};

/**
 * Get similarity threshold - device handles confidence internally
 * @returns {number}
 */
export const getSimilarityThreshold = () => {
  return 1.0; // Device handles confidence internally
};

/**
 * Preload reference faces - no-op for device-based recognition
 * @param {string[]} usernames - Array of usernames
 * @returns {Promise<Array>}
 */
export const preloadReferenceFaces = async (usernames) => {
  console.log('Using device-based face recognition - no preloading needed');
  return usernames.map(username => ({ username, success: true }));
};

/**
 * Get loaded usernames - no-op for device-based recognition
 * @returns {string[]}
 */
export const getLoadedUsernames = () => {
  return []; // No usernames to track for device-based recognition
};
