/**
 * useLocationState Hook
 * Tracks user's location state relative to office radius
 * Used for displaying warnings and blocking checkout
 */
import { useState, useEffect, useCallback } from 'react';
import { getCurrentLocationState } from '../services/locationMonitoringService';
import { getOfficeLocation, findMatchingAllowedLocation } from '../services/geofenceService';
import { getCurrentLocation } from '../services/geofenceService';
import { isWithin1km, getDistanceInMeters, formatDistance } from '../utils/distance';
import { isAutoCheckoutEnabled } from '../../attendance/services/attendanceConfigService';
import { shouldMonitorGeofenceWhileCheckedIn } from '../utils/workModeRules';

/**
 * Hook to track location state
 * @param {Object} user - User object
 * @param {boolean} isCheckedIn - Whether user is currently checked in
 * @param {number} pollInterval - Polling interval in ms (default: 30000 = 30 seconds)
 * @returns {Object} Location state and methods
 */
export const useLocationState = (user, isCheckedIn, pollInterval = 30000) => {
  const [isInside, setIsInside] = useState(null); // null = unknown, true = inside, false = outside
  const [distance, setDistance] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [autoCheckoutEnabled, setAutoCheckoutEnabled] = useState(false);
  const [error, setError] = useState(null);

  const checkLocation = useCallback(async () => {
    if (!user || !isCheckedIn) {
      setIsInside(null);
      setDistance(null);
      return;
    }

    if (!shouldMonitorGeofenceWhileCheckedIn(user)) {
      setIsInside(true);
      setDistance(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const autoCheckout = await isAutoCheckoutEnabled(true);
      setAutoCheckoutEnabled(autoCheckout);

      const currentLocation = await getCurrentLocation();
      if (!currentLocation?.latitude || !currentLocation?.longitude) {
        setError('Unable to get location');
        return;
      }

      const { match, closest, distance: dist } = await findMatchingAllowedLocation(
        user,
        currentLocation.latitude,
        currentLocation.longitude
      );

      if (match) {
        setIsInside(true);
        setDistance(dist);
        return;
      }

      const officeLocation = closest || (await getOfficeLocation(user));
      if (!officeLocation) {
        setIsInside(true);
        setDistance(null);
        return;
      }

      const distance = dist ?? getDistanceInMeters(
        currentLocation.latitude,
        currentLocation.longitude,
        officeLocation.latitude,
        officeLocation.longitude
      );

      const radiusM = officeLocation.radius_meters || officeLocation.radius || 1000;
      const inside =
        radiusM === 1000
          ? isWithin1km(
              currentLocation.latitude,
              currentLocation.longitude,
              officeLocation.latitude,
              officeLocation.longitude
            )
          : distance <= radiusM;

      setIsInside(inside);
      setDistance(distance);
    } catch (err) {
      console.error('[useLocationState] Error checking location:', err);
      setError(err.message || 'Error checking location');
    } finally {
      setIsLoading(false);
    }
  }, [user, isCheckedIn]);

  // Poll location when checked in
  useEffect(() => {
    if (!isCheckedIn || !user) {
      setIsInside(null);
      setDistance(null);
      return;
    }

    // Initial check
    checkLocation();

    // Set up polling
    const interval = setInterval(checkLocation, pollInterval);

    return () => {
      clearInterval(interval);
    };
  }, [isCheckedIn, user, checkLocation, pollInterval]);

  return {
    isInside,
    distance,
    isLoading,
    error,
    autoCheckoutEnabled,
    refresh: checkLocation,
    formattedDistance: distance ? formatDistance(distance) : null,
  };
};
