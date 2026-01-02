// Location utilities for reverse geocoding using OpenStreetMap Nominatim
import * as Location from 'expo-location';

/**
 * Request location permissions
 * @returns {Promise<boolean>} True if permissions granted, false otherwise
 */
export const requestLocationPermissions = async () => {
  try {
    // Check current permission status
    const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
    
    if (existingStatus === 'granted') {
      console.log('Location permissions already granted');
      return true;
    }

    // Request permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      console.warn('Location permission denied');
      return false;
    }

    console.log('Location permissions granted');
    return true;
  } catch (error) {
    console.error('Error requesting location permissions:', error);
    return false;
  }
};

/**
 * Get current location with coordinates
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number} | null>}
 */
export const getCurrentLocation = async () => {
  try {
    // Request permissions first
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) {
      console.warn('Location permission not granted, cannot get location');
      return null;
    }

    // Check if location services are enabled
    const isEnabled = await Location.hasServicesEnabledAsync();
    if (!isEnabled) {
      console.warn('Location services are disabled');
      return null;
    }

    // Get current position
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
      timeout: 10000, // 10 second timeout
      maximumAge: 60000, // Accept cached location up to 1 minute old
    });

    if (!location || !location.coords) {
      console.warn('Invalid location data received');
      return null;
    }

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };
  } catch (error) {
    console.error('Error getting location:', error);
    
    // Provide more specific error messages
    if (error.code === 'E_LOCATION_SERVICES_DISABLED') {
      console.error('Location services are disabled. Please enable them in device settings.');
    } else if (error.code === 'E_LOCATION_UNAVAILABLE') {
      console.error('Location is unavailable. Please check your GPS settings.');
    } else if (error.code === 'E_LOCATION_TIMEOUT') {
      console.error('Location request timed out. Please try again.');
    }
    
    return null;
  }
};

/**
 * Convert coordinates to human-readable address using OpenStreetMap Nominatim
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @returns {Promise<string>} Human-readable address or fallback to coordinates
 */
export const getAddressFromCoordinates = async (latitude, longitude) => {
  try {
    console.log(`Getting address for coordinates: ${latitude}, ${longitude}`);
    
    // Call Nominatim reverse geocoding API
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18`,
      {
        headers: {
          'User-Agent': 'AttendanceApp/1.0', // Required by Nominatim
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data && data.display_name) {
      console.log('Address found:', data.display_name);
      return data.display_name;
    } else {
      throw new Error('No address found in response');
    }
  } catch (error) {
    console.error('Error getting address from coordinates:', error);
    // Fallback to coordinates if address lookup fails
    return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
  }
};

/**
 * Get current location with both coordinates and address
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number, address: string} | null>}
 */
export const getCurrentLocationWithAddress = async () => {
  try {
    // Get coordinates first
    const location = await getCurrentLocation();
    
    if (!location) {
      console.warn('Could not get location coordinates');
      return null;
    }

    // Get address from coordinates (with timeout to prevent hanging)
    let address;
    try {
      address = await Promise.race([
        getAddressFromCoordinates(location.latitude, location.longitude),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Address lookup timeout')), 5000)
        )
      ]);
    } catch (addressError) {
      console.warn('Error getting address, using coordinates:', addressError.message);
      // Fallback to coordinates if address lookup fails or times out
      address = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;
    }
    
    return {
      ...location,
      address: address,
    };
  } catch (error) {
    console.error('Error getting location with address:', error);
    return null;
  }
};

/**
 * Format address for display (shorten if too long)
 * @param {string} address - Full address string
 * @param {number} maxLength - Maximum length for display
 * @returns {string} Formatted address
 */
export const formatAddressForDisplay = (address, maxLength = 50) => {
  if (!address) return 'Location not available';
  
  if (address.length <= maxLength) {
    return address;
  }
  
  // Try to find a good break point (comma, space, etc.)
  const breakPoints = [', ', ' ', '-'];
  let bestBreak = maxLength;
  
  for (const breakPoint of breakPoints) {
    const lastIndex = address.lastIndexOf(breakPoint, maxLength);
    if (lastIndex > maxLength * 0.7) { // At least 70% of max length
      bestBreak = lastIndex;
      break;
    }
  }
  
  return address.substring(0, bestBreak) + '...';
};

/**
 * Extract city and country from full address
 * @param {string} address - Full address string
 * @returns {Object} {city: string, country: string}
 */
export const extractCityAndCountry = (address) => {
  if (!address) {
    return { city: 'Unknown', country: 'Unknown' };
  }
  
  // Split by comma and get the last two parts (usually city, country)
  const parts = address.split(',').map(part => part.trim());
  
  if (parts.length >= 2) {
    return {
      city: parts[parts.length - 2] || 'Unknown',
      country: parts[parts.length - 1] || 'Unknown',
    };
  }
  
  return { city: 'Unknown', country: 'Unknown' };
};
