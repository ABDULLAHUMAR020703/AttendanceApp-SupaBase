// API Gateway Configuration
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Get the appropriate API Gateway URL based on the platform
 *
 * PRODUCTION:
 * - Set apiGatewayUrl in app.json → expo.extra
 * - Example: "https://api.hadir.techdotglobal.com"
 *
 * LOCAL DEVELOPMENT (only when apiGatewayUrl is unset/null):
 * - iOS Simulator: localhost
 * - Android Emulator: 10.0.2.2
 * - Physical Device: set apiGatewayUrl to your LAN IP
 */
const getApiGatewayUrl = () => {
  // Prefer expo.extra.apiGatewayUrl (production EAS builds always set this)
  const configuredUrl = Constants.expoConfig?.extra?.apiGatewayUrl;
  if (configuredUrl && configuredUrl !== null && configuredUrl !== 'null') {
    let url = typeof configuredUrl === 'string' ? configuredUrl : String(configuredUrl);
    url = url.replace(/\/+$/, '');
    return url;
  }

  // Platform-specific defaults (local development only)
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3000';
  } else if (Platform.OS === 'ios') {
    return 'http://localhost:3000';
  } else {
    return 'http://localhost:3000';
  }
};

// API Gateway base URL — production: https://api.hadir.techdotglobal.com via app.json

export const API_GATEWAY_URL = getApiGatewayUrl();

// API Gateway timeout in milliseconds
export const API_TIMEOUT = 10000; // 10 seconds

// Log the API Gateway URL being used (for debugging)
if (__DEV__) {
  console.log('API Gateway URL:', String(API_GATEWAY_URL));
  console.log('Platform:', Platform.OS);
}

