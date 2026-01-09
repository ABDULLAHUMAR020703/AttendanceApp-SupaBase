/**
 * Reverse Geocoding Utility
 * Converts coordinates to human-readable location names using OpenStreetMap Nominatim
 * Includes debouncing and error handling
 */
import { getAddressFromCoordinates } from '../../../utils/location';

// Debounce timer reference (per-instance)
const geocodeTimers = new Map();

/**
 * Reverse geocode coordinates to location name with debouncing
 * @param {number} latitude - Latitude coordinate
 * @param {number} longitude - Longitude coordinate
 * @param {number} delay - Debounce delay in milliseconds (default: 600ms)
 * @param {string} key - Optional key for managing multiple concurrent requests
 * @returns {Promise<string>} Human-readable location name or "Unknown location"
 */
export const reverseGeocode = async (latitude, longitude, delay = 600, key = 'default') => {
  return new Promise((resolve) => {
    // Clear existing timer for this key
    if (geocodeTimers.has(key)) {
      clearTimeout(geocodeTimers.get(key));
      geocodeTimers.delete(key);
    }

    // Set new timer for debouncing
    const timer = setTimeout(async () => {
      try {
        console.log('[ReverseGeocoding] Resolving location name for:', {
          latitude: latitude.toFixed(6),
          longitude: longitude.toFixed(6),
        });

        const address = await getAddressFromCoordinates(latitude, longitude);

        if (address && address.trim()) {
          // Check if address is just coordinates
          const isCoordinatePattern = /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(address.trim());
          if (isCoordinatePattern) {
            console.warn('[ReverseGeocoding] Nominatim returned coordinates, using "Unknown location"');
            resolve('Unknown location');
            return;
          }
        }

        // Format address for display
        const formattedAddress = formatLocationName(address);
        console.log('[ReverseGeocoding] Location name resolved:', formattedAddress);
        resolve(formattedAddress);
      } catch (error) {
        console.error('[ReverseGeocoding] Error resolving location name:', error);
        resolve('Unknown location');
      } finally {
        // Clean up timer reference
        geocodeTimers.delete(key);
      }
    }, delay);

    geocodeTimers.set(key, timer);
  });
};

/**
 * Format location name for display
 * @param {string} address - Full address from Nominatim
 * @returns {string} Formatted location name
 */
const formatLocationName = (address) => {
  if (!address || typeof address !== 'string') {
    return 'Unknown location';
  }

  // Check if it's just coordinates
  const isCoordinatePattern = /^-?\d+\.?\d*,\s*-?\d+\.?\d*$/.test(address.trim());
  if (isCoordinatePattern) {
    return 'Unknown location';
  }

  // Split by comma and take meaningful parts
  const parts = address.split(',').map(part => part.trim()).filter(part => part.length > 0);

  if (parts.length === 0) {
    return 'Unknown location';
  }

  // For better readability, show: street/road, area, city, country
  // Take up to 4 parts (excluding postal code if present)
  const meaningfulParts = parts
    .filter(part => !/^\d+$/.test(part)) // Remove pure numbers (postal codes)
    .slice(0, 4);

  if (meaningfulParts.length === 0) {
    return 'Unknown location';
  }

  return meaningfulParts.join(', ');
};

/**
 * Cancel pending reverse geocoding request
 * @param {string} key - Optional key for specific request (default: cancels all)
 */
export const cancelReverseGeocode = (key = null) => {
  if (key) {
    // Cancel specific request
    if (geocodeTimers.has(key)) {
      clearTimeout(geocodeTimers.get(key));
      geocodeTimers.delete(key);
    }
  } else {
    // Cancel all pending requests
    geocodeTimers.forEach((timer) => {
      clearTimeout(timer);
    });
    geocodeTimers.clear();
  }
};
