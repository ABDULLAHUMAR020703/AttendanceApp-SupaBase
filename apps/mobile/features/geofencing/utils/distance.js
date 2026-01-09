/**
 * Distance calculation utilities for geofencing
 * Pure functions using Haversine formula for calculating distances between coordinates
 */

/**
 * Calculate the distance between two coordinates using the Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @param {string} unit - Unit of distance: 'km' (kilometers) or 'm' (meters). Default: 'm'
 * @returns {number} Distance in the specified unit
 */
export const calculateDistance = (lat1, lon1, lat2, lon2, unit = 'm') => {
  // Validate inputs
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number' ||
    isNaN(lat1) ||
    isNaN(lon1) ||
    isNaN(lat2) ||
    isNaN(lon2)
  ) {
    console.warn('[Distance] Invalid coordinates provided');
    return Infinity;
  }

  // Validate latitude range (-90 to 90)
  if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) {
    console.warn('[Distance] Latitude out of range (-90 to 90)');
    return Infinity;
  }

  // Validate longitude range (-180 to 180)
  if (lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) {
    console.warn('[Distance] Longitude out of range (-180 to 180)');
    return Infinity;
  }

  // Earth's radius in meters
  const R = 6371000; // meters

  // Convert degrees to radians
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  // Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in meters

  // Convert to requested unit
  if (unit === 'km') {
    return distance / 1000;
  }

  return distance; // Return in meters
};

/**
 * Convert degrees to radians
 * @param {number} degrees - Angle in degrees
 * @returns {number} Angle in radians
 */
const toRadians = (degrees) => {
  return (degrees * Math.PI) / 180;
};

/**
 * Check if a point is within a geofence (circle)
 * @param {number} pointLat - Latitude of the point to check
 * @param {number} pointLon - Longitude of the point to check
 * @param {number} centerLat - Latitude of the geofence center
 * @param {number} centerLon - Longitude of the geofence center
 * @param {number} radius - Radius of the geofence in meters
 * @returns {boolean} True if point is within the geofence
 */
export const isPointInGeofence = (pointLat, pointLon, centerLat, centerLon, radius) => {
  const distance = calculateDistance(pointLat, pointLon, centerLat, centerLon, 'm');
  return distance <= radius;
};

/**
 * Check if user is within 1km radius of a location
 * Pure utility function using Haversine formula
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @param {number} targetLat - Target location latitude
 * @param {number} targetLon - Target location longitude
 * @returns {boolean} True if user is within 1km (1000m) radius
 */
export const isWithin1km = (userLat, userLon, targetLat, targetLon) => {
  const ONE_KM_IN_METERS = 1000;
  return isPointInGeofence(userLat, userLon, targetLat, targetLon, ONE_KM_IN_METERS);
};

/**
 * Get distance to target location in meters
 * Pure utility function using Haversine formula
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @param {number} targetLat - Target location latitude
 * @param {number} targetLon - Target location longitude
 * @returns {number} Distance in meters, or Infinity if invalid coordinates
 */
export const getDistanceInMeters = (userLat, userLon, targetLat, targetLon) => {
  return calculateDistance(userLat, userLon, targetLat, targetLon, 'm');
};

/**
 * Format distance for display
 * @param {number} distance - Distance in meters
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted distance string
 */
export const formatDistance = (distance, decimals = 1) => {
  if (distance === Infinity || distance === null || distance === undefined || isNaN(distance)) {
    return 'Unknown';
  }

  if (distance < 1000) {
    return `${distance.toFixed(decimals)} m`;
  }

  const km = distance / 1000;
  return `${km.toFixed(decimals)} km`;
};

/**
 * Get the closest geofence to a point
 * @param {number} pointLat - Latitude of the point
 * @param {number} pointLon - Longitude of the point
 * @param {Array} geofences - Array of geofence objects with lat, lon, radius properties
 * @returns {Object|null} Closest geofence object with distance, or null if no geofences
 */
export const getClosestGeofence = (pointLat, pointLon, geofences) => {
  if (!Array.isArray(geofences) || geofences.length === 0) {
    return null;
  }

  let closest = null;
  let minDistance = Infinity;

  geofences.forEach((geofence) => {
    const distance = calculateDistance(
      pointLat,
      pointLon,
      geofence.latitude || geofence.lat,
      geofence.longitude || geofence.lon,
      'm'
    );

    if (distance < minDistance) {
      minDistance = distance;
      closest = {
        ...geofence,
        distance,
      };
    }
  });

  return closest;
};
