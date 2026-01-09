/**
 * useGeofence Hook
 * Custom React hook for geofence management and monitoring
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import {
  getCurrentLocation,
  checkGeofenceStatus,
  loadGeofences,
  addGeofence as addGeofenceService,
  removeGeofence as removeGeofenceService,
  getActiveGeofence,
  setActiveGeofence as setActiveGeofenceService,
} from '../services/geofenceService';
import { calculateDistance, formatDistance } from '../utils/distance';

/**
 * Custom hook for geofence management
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoMonitor - Automatically monitor location (default: false)
 * @param {number} options.updateInterval - Location update interval in milliseconds (default: 5000)
 * @param {number} options.distanceThreshold - Minimum distance change to trigger update in meters (default: 10)
 * @returns {Object} Geofence state and methods
 */
export const useGeofence = (options = {}) => {
  const {
    autoMonitor = false,
    updateInterval = 5000,
    distanceThreshold = 10,
  } = options;

  // State
  const [geofences, setGeofences] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [geofenceStatus, setGeofenceStatus] = useState({
    isInside: false,
    geofence: null,
    distance: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [activeGeofenceId, setActiveGeofenceId] = useState(null);

  // Refs
  const locationSubscriptionRef = useRef(null);
  const lastLocationRef = useRef(null);

  /**
   * Load geofences from storage
   */
  const loadGeofencesData = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await loadGeofences();
      setGeofences(data);

      // Load active geofence
      const activeId = await getActiveGeofence();
      setActiveGeofenceId(activeId);
    } catch (err) {
      console.error('[useGeofence] Error loading geofences:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update location and check geofence status
   */
  const updateLocation = useCallback(async () => {
    try {
      const location = await getCurrentLocation();
      if (!location) {
        return;
      }

      // Check if location changed significantly
      if (lastLocationRef.current) {
        const distance = calculateDistance(
          lastLocationRef.current.latitude,
          lastLocationRef.current.longitude,
          location.latitude,
          location.longitude,
          'm'
        );

        if (distance < distanceThreshold) {
          // Location hasn't changed enough, skip update
          return;
        }
      }

      setCurrentLocation(location);
      lastLocationRef.current = location;

      // Check geofence status
      const status = await checkGeofenceStatus(location.latitude, location.longitude);
      setGeofenceStatus(status);
    } catch (err) {
      console.error('[useGeofence] Error updating location:', err);
      setError(err.message);
    }
  }, [distanceThreshold]);

  /**
   * Add a new geofence
   */
  const addGeofence = useCallback(async (geofence) => {
    try {
      setIsLoading(true);
      const success = await addGeofenceService(geofence);
      if (success) {
        await loadGeofencesData();
      }
      return success;
    } catch (err) {
      console.error('[useGeofence] Error adding geofence:', err);
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadGeofencesData]);

  /**
   * Remove a geofence
   */
  const removeGeofence = useCallback(async (geofenceId) => {
    try {
      setIsLoading(true);
      const success = await removeGeofenceService(geofenceId);
      if (success) {
        await loadGeofencesData();

        // If removed geofence was active, clear active geofence
        if (activeGeofenceId === geofenceId) {
          await setActiveGeofence(null);
          setActiveGeofenceId(null);
        }
      }
      return success;
    } catch (err) {
      console.error('[useGeofence] Error removing geofence:', err);
      setError(err.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadGeofencesData, activeGeofenceId]);

  /**
   * Set active geofence for monitoring
   */
  const setActiveGeofence = useCallback(async (geofenceId) => {
    try {
      const success = await setActiveGeofenceService(geofenceId);
      if (success) {
        setActiveGeofenceId(geofenceId);
      }
      return success;
    } catch (err) {
      console.error('[useGeofence] Error setting active geofence:', err);
      setError(err.message);
      return false;
    }
  }, []);

  /**
   * Start location monitoring
   */
  const startMonitoring = useCallback(async () => {
    try {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission not granted');
        return false;
      }

      // Start location updates
      locationSubscriptionRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: updateInterval,
          distanceInterval: distanceThreshold,
        },
        (location) => {
          if (location && location.coords) {
            const newLocation = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              accuracy: location.coords.accuracy,
            };

            setCurrentLocation(newLocation);
            lastLocationRef.current = newLocation;

            // Check geofence status
            checkGeofenceStatus(newLocation.latitude, newLocation.longitude).then((status) => {
              setGeofenceStatus(status);
            });
          }
        }
      );

      setIsMonitoring(true);
      return true;
    } catch (err) {
      console.error('[useGeofence] Error starting monitoring:', err);
      setError(err.message);
      return false;
    }
  }, [updateInterval, distanceThreshold]);

  /**
   * Stop location monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (locationSubscriptionRef.current) {
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }
    setIsMonitoring(false);
  }, []);

  /**
   * Refresh current location and geofence status
   */
  const refresh = useCallback(async () => {
    await updateLocation();
  }, [updateLocation]);

  // Load geofences on mount
  useEffect(() => {
    loadGeofencesData();
  }, [loadGeofencesData]);

  // Auto-monitor if enabled
  useEffect(() => {
    if (autoMonitor) {
      startMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [autoMonitor, startMonitoring, stopMonitoring]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    // State
    geofences,
    currentLocation,
    geofenceStatus,
    isLoading,
    error,
    isMonitoring,
    activeGeofenceId,

    // Computed values
    formattedDistance: geofenceStatus.distance
      ? formatDistance(geofenceStatus.distance)
      : null,
    isInsideGeofence: geofenceStatus.isInside,

    // Methods
    addGeofence,
    removeGeofence,
    setActiveGeofence,
    startMonitoring,
    stopMonitoring,
    refresh,
    reload: loadGeofencesData,
  };
};
