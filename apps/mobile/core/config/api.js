// API Gateway Configuration
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Get the appropriate API Gateway URL based on the platform
 * 
 * PRODUCTION (Render Deployment):
 * - Set apiGatewayUrl in app.json to your Render service URL
 * - Example: "https://attendanceapp-supabase-1.onrender.com"
 * 
 * LOCAL DEVELOPMENT:
 * - iOS Simulator: localhost works
 * - Android Emulator: Use 10.0.2.2 (special IP for host machine)
 * - Physical Device: Use your computer's local IP address
 * 
 * To find your computer's IP:
 * - Windows: ipconfig (look for IPv4 Address)
 * - Mac/Linux: ifconfig or ip addr
 * 
 * Example: 'http://192.168.1.100:3000'
 */
const getApiGatewayUrl = () => {
  // Check if there's a configured URL in app.json (for production or physical devices)
  // Set this to your Render service URL for production
  // Set to null in app.json to use platform-specific defaults (for local development)
  const configuredUrl = Constants.expoConfig?.extra?.apiGatewayUrl;
  if (configuredUrl && configuredUrl !== null && configuredUrl !== 'null') {
    // Remove trailing slash if present to prevent double slashes in URLs
    let url = typeof configuredUrl === 'string' ? configuredUrl : String(configuredUrl);
    url = url.replace(/\/+$/, ''); // Remove trailing slashes
    return url;
  }

  // Platform-specific defaults (for local development only)
  if (Platform.OS === 'android') {
    // Android emulator uses 10.0.2.2 to reach host machine
    // For physical devices, you'll need to set this manually
    return 'http://10.0.2.2:3000';
  } else if (Platform.OS === 'ios') {
    // iOS simulator can use localhost
    return 'http://localhost:3000';
  } else {
    // Web or other platforms
    return 'http://localhost:3000';
  }
};

// API Gateway base URL
// PRODUCTION: Set in app.json under "extra.apiGatewayUrl" to your Render service URL
// LOCAL DEV: For physical devices, set in app.json to your computer's IP address
// Example: 'http://192.168.1.100:3000' (local) or 'https://your-service.onrender.com' (production)

export const API_GATEWAY_URL = getApiGatewayUrl();

// API Gateway timeout in milliseconds
export const API_TIMEOUT = 10000; // 10 seconds

// Log the API Gateway URL being used (for debugging)
if (__DEV__) {
  console.log('API Gateway URL:', String(API_GATEWAY_URL));
  console.log('Platform:', Platform.OS);
}

