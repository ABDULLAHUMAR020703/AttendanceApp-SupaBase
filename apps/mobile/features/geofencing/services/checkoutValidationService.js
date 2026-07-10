/**
 * Checkout Validation Service
 * Validates manual checkout attempts based on location and auto_checkout_enabled setting
 */
import { getOfficeLocation, findMatchingAllowedLocation, getCurrentLocation } from './geofenceService';
import { formatDistance } from '../utils/distance';
import { isAutoCheckoutEnabled } from '../../attendance/services/attendanceConfigService';
import { shouldMonitorGeofenceWhileCheckedIn } from '../utils/workModeRules';

/**
 * Validate manual checkout attempt
 * @param {Object} user - User object
 * @param {Object} location - Current location (optional, will fetch if not provided)
 * @returns {Promise<{valid: boolean, error?: string, distance?: number}>}
 */
export const validateCheckoutLocation = async (user, location = null) => {
  try {
    if (!shouldMonitorGeofenceWhileCheckedIn(user)) {
      return { valid: true };
    }

    const autoCheckoutEnabled = await isAutoCheckoutEnabled(true);
    if (autoCheckoutEnabled) {
      return { valid: true };
    }

    console.log('[CheckoutValidation] Auto checkout disabled, validating location...');

    let currentLocation = location;
    if (!currentLocation) {
      currentLocation = await getCurrentLocation();
    }

    if (!currentLocation?.latitude || !currentLocation?.longitude) {
      return {
        valid: false,
        error: 'Unable to get your current location. Please enable location services and try again.',
      };
    }

    const { match, closest, distance } = await findMatchingAllowedLocation(
      user,
      currentLocation.latitude,
      currentLocation.longitude
    );

    if (match) {
      return { valid: true };
    }

    const siteLabel = closest?.name || 'your work site';
    if (!closest) {
      return { valid: true, warning: 'No geofence configured. Checkout allowed.' };
    }

    const radiusM = closest.radius_meters || closest.radius || 1000;
    return {
      valid: false,
      error: `You must be within ${formatDistance(radiusM)} of ${siteLabel} to check out. You are currently ${formatDistance(distance)} away.`,
      distance,
    };
  } catch (error) {
    console.error('[CheckoutValidation] Error validating checkout location:', error);
    return {
      valid: false,
      error: 'Unable to validate your location. Please try again.',
    };
  }
};
