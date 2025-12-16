// API Gateway Configuration
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Get the appropriate API Gateway URL based on the platform
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
  // Check if there's an environment variable override
  if (Constants.expoConfig?.extra?.apiGatewayUrl) {
    return Constants.expoConfig.extra.apiGatewayUrl;
  }

  // Platform-specific defaults
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
// IMPORTANT: For physical devices, update this to your computer's IP address
// Example: 'http://192.168.1.100:3000'
// You can also set it in app.json under "extra.apiGatewayUrl"

export const API_GATEWAY_URL = 'http://192.168.18.38:3000'; // Your IP

// API Gateway timeout in milliseconds
export const API_TIMEOUT = 10000; // 10 seconds

// Log the API Gateway URL being used (for debugging)
if (__DEV__) {
  console.log('API Gateway URL:', API_GATEWAY_URL);
  console.log('Platform:', Platform.OS);
}

