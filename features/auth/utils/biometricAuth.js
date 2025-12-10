// Biometric Authentication Utility for Thumbprint/Fingerprint Authentication
// Dynamically import to avoid crashes in Expo Go on Android
let LocalAuthentication = null;
let isExpoGoAndroid = false;

// Check if we're in Expo Go on Android (disable biometric)
try {
  const Platform = require('react-native').Platform;
  const Constants = require('expo-constants').default;
  isExpoGoAndroid = Platform.OS === 'android' && Constants.appOwnership === 'expo';
} catch (e) {
  // Safe fallback
  isExpoGoAndroid = false;
}

// Lazy load the module to prevent crashes on Android Expo Go
const getLocalAuthentication = async () => {
  // Completely skip loading if in Expo Go on Android
  if (isExpoGoAndroid) {
    console.warn('Biometric disabled: Running in Expo Go on Android');
    return null;
  }
  
  if (LocalAuthentication === null) {
    try {
      // Try dynamic import with additional error handling
      const module = await Promise.resolve(import('expo-local-authentication'));
      LocalAuthentication = module.default || module;
      return LocalAuthentication;
    } catch (error) {
      console.warn('expo-local-authentication not available (Expo Go limitation):', error.message);
      // Return null instead of throwing to prevent crashes
      return null;
    }
  }
  return LocalAuthentication.default || LocalAuthentication;
};

/**
 * Check if biometric authentication is available on the device
 * @returns {Promise<{available: boolean, types: string[], error?: string}>}
 */
export const checkBiometricAvailability = async () => {
  try {
    const LocalAuth = await getLocalAuthentication();
    if (!LocalAuth) {
      return {
        available: false,
        types: [],
        error: 'Biometric authentication module not available. This may not work in Expo Go on Android. Please use Face Verification instead.'
      };
    }
    
    const compatible = await LocalAuth.hasHardwareAsync();
    
    if (!compatible) {
      return {
        available: false,
        types: [],
        error: 'Biometric authentication is not available on this device'
      };
    }

    const enrolled = await LocalAuth.isEnrolledAsync();
    
    if (!enrolled) {
      return {
        available: false,
        types: [],
        error: 'No biometrics enrolled. Please set up fingerprint/face ID in device settings.'
      };
    }

    const supportedTypes = await LocalAuth.supportedAuthenticationTypesAsync();
    
    return {
      available: true,
      types: supportedTypes.map(type => {
        switch (type) {
          case LocalAuth.AuthenticationType.FINGERPRINT:
            return 'fingerprint';
          case LocalAuth.AuthenticationType.FACIAL_RECOGNITION:
            return 'face';
          case LocalAuth.AuthenticationType.IRIS:
            return 'iris';
          default:
            return 'unknown';
        }
      }),
      error: null
    };
  } catch (error) {
    console.error('Error checking biometric availability:', error);
    // Handle cases where module might not be available in Expo Go
    if (error.message && (error.message.includes('Native module') || error.message.includes('not available') || error.message.includes('expo-local-authentication'))) {
      return {
        available: false,
        types: [],
        error: 'Biometric authentication module not available in Expo Go. This feature requires a development build. Please use Face Verification instead.'
      };
    }
    return {
      available: false,
      types: [],
      error: `Error checking biometric availability: ${error.message}`
    };
  }
};

/**
 * Authenticate user using biometric (fingerprint/face ID)
 * @param {string} promptMessage - Custom message to show during authentication
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const authenticateWithBiometric = async (promptMessage = 'Authenticate to continue') => {
  try {
    const LocalAuth = await getLocalAuthentication();
    if (!LocalAuth) {
      return {
        success: false,
        error: 'Biometric authentication module not available. Please use Face Verification instead.'
      };
    }

    // Check availability first
    const availability = await checkBiometricAvailability();
    
    if (!availability.available) {
      return {
        success: false,
        error: availability.error || 'Biometric authentication not available'
      };
    }

    // Attempt authentication
    const result = await LocalAuth.authenticateAsync({
      promptMessage: promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false, // Allow fallback to device PIN/password
      fallbackLabel: 'Use Passcode',
    });

    if (result.success) {
      return {
        success: true,
        error: null
      };
    } else {
      let errorMessage = 'Authentication cancelled';
      
      if (result.error === 'user_cancel') {
        errorMessage = 'Authentication cancelled by user';
      } else if (result.error === 'user_fallback') {
        errorMessage = 'User chose to use passcode instead';
      } else if (result.error === 'system_cancel') {
        errorMessage = 'Authentication cancelled by system';
      } else if (result.error === 'passcode_not_set') {
        errorMessage = 'No passcode set on device';
      } else if (result.error === 'not_available') {
        errorMessage = 'Biometric authentication not available';
      } else if (result.error === 'not_enrolled') {
        errorMessage = 'No biometrics enrolled';
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  } catch (error) {
    console.error('Error during biometric authentication:', error);
    // Handle cases where module might not be available in Expo Go
    if (error.message && (error.message.includes('Native module') || error.message.includes('not available'))) {
      return {
        success: false,
        error: 'Biometric authentication is not supported in Expo Go. Please use face verification instead, or create a development build.'
      };
    }
    return {
      success: false,
      error: `Authentication error: ${error.message}`
    };
  }
};

/**
 * Get human-readable biometric type name
 * @param {string[]} types - Array of biometric types
 * @returns {string}
 */
export const getBiometricTypeName = (types) => {
  if (types.includes('fingerprint')) {
    return types.includes('face') ? 'Fingerprint or Face ID' : 'Fingerprint';
  } else if (types.includes('face')) {
    return 'Face ID';
  } else if (types.includes('iris')) {
    return 'Iris';
  }
  return 'Biometric';
};

/**
 * Check if device has fingerprint support (specifically)
 * @returns {Promise<boolean>}
 */
export const hasFingerprintSupport = async () => {
  try {
    const availability = await checkBiometricAvailability();
    return availability.available && availability.types.includes('fingerprint');
  } catch (error) {
    return false;
  }
};

