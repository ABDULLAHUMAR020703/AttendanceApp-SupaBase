// Location utilities — progressive GPS for Check-In (coords first; address async).
import * as Location from 'expo-location';

/** JS-side timeout: expo-location no longer honors native `timeout` on getCurrentPositionAsync. */
const DEFAULT_GPS_TIMEOUT_MS = 12000;
const LAST_KNOWN_MAX_AGE_MS = 60000;
const ADDRESS_TIMEOUT_MS = 5000;

/**
 * Request location permissions
 * @returns {Promise<boolean>} True if permissions granted, false otherwise
 */
export const requestLocationPermissions = async () => {
  try {
    const { status: existingStatus } = await Location.getForegroundPermissionsAsync();

    if (existingStatus === 'granted') {
      console.log('Location permissions already granted');
      return true;
    }

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
 * True only when latitude/longitude are finite numbers.
 * @param {object|null|undefined} location
 * @returns {boolean}
 */
export const hasValidCoordinates = (location) => {
  if (!location || typeof location !== 'object') return false;
  const { latitude, longitude } = location;
  return (
    typeof latitude === 'number' &&
    Number.isFinite(latitude) &&
    typeof longitude === 'number' &&
    Number.isFinite(longitude)
  );
};

const toCoords = (locationObject, source) => {
  if (!locationObject?.coords) return null;
  const { latitude, longitude, accuracy } = locationObject.coords;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
  // Reject the null-island (0, 0) reading — it indicates a failed fix, not a real position.
  if (Math.abs(latitude) < 0.0001 && Math.abs(longitude) < 0.0001) return null;
  return {
    latitude,
    longitude,
    accuracy: accuracy ?? null,
    address: null,
    source: source || 'gps',
    timestamp: locationObject.timestamp ?? Date.now(),
  };
};

/**
 * Prefer a fresher / more authoritative fix. GPS beats last-known; keep address if new fix lacks one.
 */
const mergeLocationUpdate = (current, next) => {
  if (!hasValidCoordinates(next)) return current;
  if (!hasValidCoordinates(current)) return next;

  const currentIsGps = current.source === 'gps';
  const nextIsGps = next.source === 'gps';

  if (nextIsGps && !currentIsGps) {
    return {
      ...next,
      address: next.address || current.address || null,
    };
  }
  if (!nextIsGps && currentIsGps) {
    // Ignore stale last-known after we already have GPS, unless only address improved on same fix.
    if (
      next.address &&
      !current.address &&
      next.latitude === current.latitude &&
      next.longitude === current.longitude
    ) {
      return { ...current, address: next.address };
    }
    return current;
  }

  // Same tier: prefer newer timestamp; preserve address if missing on next.
  const currentTs = current.timestamp ?? 0;
  const nextTs = next.timestamp ?? 0;
  if (nextTs >= currentTs) {
    return {
      ...next,
      address: next.address || current.address || null,
    };
  }
  return {
    ...current,
    address: current.address || next.address || null,
  };
};

/**
 * Cached / last-known position (fast). Does not request a new hardware fix.
 * @param {{ maxAge?: number }} [options]
 * @returns {Promise<object|null>}
 */
export const getLastKnownLocationCoords = async (options = {}) => {
  try {
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) return null;

    const maxAge = options.maxAge ?? LAST_KNOWN_MAX_AGE_MS;
    const last = await Location.getLastKnownPositionAsync({ maxAge });
    return toCoords(last, 'lastKnown');
  } catch (error) {
    console.warn('[location] getLastKnownPositionAsync failed:', error?.message || error);
    return null;
  }
};

/**
 * Get current location with coordinates (fresh hardware fix).
 * Uses a JavaScript timeout because expo-location ignores native timeout/maximumAge.
 * @param {{ timeoutMs?: number, accuracy?: number }} [options]
 * @returns {Promise<{latitude: number, longitude: number, accuracy: number, source: string, timestamp: number, address: null} | null>}
 */
export const getCurrentLocation = async (options = {}) => {
  const timeoutMs = options.timeoutMs ?? DEFAULT_GPS_TIMEOUT_MS;
  const accuracy = options.accuracy ?? Location.Accuracy.Balanced;

  try {
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) {
      console.warn('Location permission not granted, cannot get location');
      return null;
    }

    const isEnabled = await Location.hasServicesEnabledAsync();
    if (!isEnabled) {
      console.warn('Location services are disabled');
      return null;
    }

    const positionPromise = Location.getCurrentPositionAsync({ accuracy });
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        const err = new Error('Location request timed out');
        err.code = 'E_LOCATION_TIMEOUT';
        reject(err);
      }, timeoutMs);
    });

    let location;
    try {
      location = await Promise.race([positionPromise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }

    return toCoords(location, 'gps');
  } catch (error) {
    console.error('Error getting location:', error);

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
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<string>}
 */
export const getAddressFromCoordinates = async (latitude, longitude) => {
  try {
    console.log(`Getting address for coordinates: ${latitude}, ${longitude}`);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&zoom=18`,
      {
        headers: {
          'User-Agent': 'AttendanceApp/1.0',
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
    }
    throw new Error('No address found in response');
  } catch (error) {
    console.error('Error getting address from coordinates:', error);
    return `${(latitude ?? 0).toFixed(6)}, ${(longitude ?? 0).toFixed(6)}`;
  }
};

/**
 * Resolve address without blocking the caller. Invokes onAddress when done.
 */
export const resolveAddressInBackground = (latitude, longitude, onAddress) => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

  Promise.race([
    getAddressFromCoordinates(latitude, longitude),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Address lookup timeout')), ADDRESS_TIMEOUT_MS)
    ),
  ])
    .then((address) => {
      if (typeof onAddress === 'function') onAddress(address);
    })
    .catch((err) => {
      console.warn('[location] background geocode failed:', err?.message || err);
      const fallback = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      if (typeof onAddress === 'function') onAddress(fallback);
    });
};

/** Coalesce concurrent progressive acquisitions (shared listeners). */
let progressiveInFlight = null;
let progressiveLatest = null;
const progressiveListeners = new Set();

const notifyProgressiveListeners = (location) => {
  progressiveListeners.forEach((fn) => {
    try {
      fn(location);
    } catch (e) {
      console.warn('[location] onUpdate listener error:', e?.message || e);
    }
  });
};

const addProgressiveListener = (onUpdate) => {
  if (typeof onUpdate !== 'function') return () => {};
  progressiveListeners.add(onUpdate);
  if (hasValidCoordinates(progressiveLatest)) {
    try {
      onUpdate(progressiveLatest);
    } catch (e) {
      console.warn('[location] onUpdate listener error:', e?.message || e);
    }
  }
  return () => {
    progressiveListeners.delete(onUpdate);
  };
};

/**
 * Progressive location for Check-In:
 * 1) Emit last-known coords immediately (if any)
 * 2) Acquire fresh GPS in parallel (JS timeout)
 * 3) Reverse-geocode in background; never blocks return / Check-In
 *
 * @param {{
 *   onUpdate?: (loc: object) => void,
 *   timeoutMs?: number,
 *   lastKnownMaxAgeMs?: number,
 *   resolveAddress?: boolean,
 * }} [options]
 * @returns {Promise<object|null>} Best location available when fresh GPS settles (may lack address)
 */
export const acquireLocationProgressive = async (options = {}) => {
  const {
    onUpdate,
    timeoutMs = DEFAULT_GPS_TIMEOUT_MS,
    lastKnownMaxAgeMs = LAST_KNOWN_MAX_AGE_MS,
    resolveAddress = true,
  } = options;

  const removeListener = addProgressiveListener(onUpdate);

  if (progressiveInFlight) {
    try {
      return await progressiveInFlight;
    } finally {
      removeListener();
    }
  }

  progressiveInFlight = (async () => {
    let best = hasValidCoordinates(progressiveLatest) ? progressiveLatest : null;

    const emit = (partial) => {
      best = mergeLocationUpdate(best, partial);
      progressiveLatest = best;
      if (hasValidCoordinates(best)) {
        notifyProgressiveListeners(best);
      }
    };

    // 1) Instant cached fix
    const lastKnown = await getLastKnownLocationCoords({ maxAge: lastKnownMaxAgeMs });
    if (lastKnown) {
      console.log('[location] Using last-known position for immediate UI');
      emit(lastKnown);
      if (resolveAddress) {
        resolveAddressInBackground(lastKnown.latitude, lastKnown.longitude, (address) => {
          emit({ ...lastKnown, address });
        });
      }
    }

    // 2) Fresh GPS (does not wait on address)
    const fresh = await getCurrentLocation({ timeoutMs });
    if (fresh) {
      console.log('[location] Fresh GPS fix acquired');
      emit(fresh);
      if (resolveAddress) {
        resolveAddressInBackground(fresh.latitude, fresh.longitude, (address) => {
          emit({ ...fresh, address });
        });
      }
    } else if (!hasValidCoordinates(best)) {
      console.warn('[location] Fresh GPS failed and no last-known available');
    }

    return hasValidCoordinates(best) ? best : null;
  })();

  try {
    return await progressiveInFlight;
  } finally {
    progressiveInFlight = null;
    removeListener();
  }
};

/**
 * Get current location with both coordinates and address (blocking address).
 * Prefer acquireLocationProgressive for Check-In UI. Kept for other callers.
 */
export const getCurrentLocationWithAddress = async () => {
  try {
    const location = await getCurrentLocation();

    if (!location || !hasValidCoordinates(location)) {
      console.warn('Could not get location coordinates');
      return null;
    }

    let address;
    try {
      address = await Promise.race([
        getAddressFromCoordinates(location.latitude, location.longitude),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Address lookup timeout')), ADDRESS_TIMEOUT_MS)
        ),
      ]);
    } catch (addressError) {
      console.warn('Error getting address, using coordinates:', addressError.message);
      address = `${(location.latitude ?? 0).toFixed(6)}, ${(location.longitude ?? 0).toFixed(6)}`;
    }

    return {
      ...location,
      address,
    };
  } catch (error) {
    console.error('Error getting location with address:', error);
    return null;
  }
};

/**
 * Ensure coordinates are available. Does not wait for reverse geocoding.
 * Coalesces with acquireLocationProgressive to avoid duplicate GPS work.
 */
export const ensureLocationWithAddress = async (options = {}) => {
  return acquireLocationProgressive({
    onUpdate: options.onUpdate,
    timeoutMs: options.timeoutMs,
    lastKnownMaxAgeMs: options.lastKnownMaxAgeMs,
    resolveAddress: options.resolveAddress !== false,
  });
};

/**
 * Format address for display (shorten if too long)
 */
export const formatAddressForDisplay = (address, maxLength = 50) => {
  if (!address) return 'Location not available';

  if (address.length <= maxLength) {
    return address;
  }

  const breakPoints = [', ', ' ', '-'];
  let bestBreak = maxLength;

  for (const breakPoint of breakPoints) {
    const lastIndex = address.lastIndexOf(breakPoint, maxLength);
    if (lastIndex > maxLength * 0.7) {
      bestBreak = lastIndex;
      break;
    }
  }

  return address.substring(0, bestBreak) + '...';
};

/**
 * Extract city and country from full address
 */
export const extractCityAndCountry = (address) => {
  if (!address) {
    return { city: 'Unknown', country: 'Unknown' };
  }

  const parts = address.split(',').map((part) => part.trim());

  if (parts.length >= 2) {
    return {
      city: parts[parts.length - 2] || 'Unknown',
      country: parts[parts.length - 1] || 'Unknown',
    };
  }

  return { city: 'Unknown', country: 'Unknown' };
};
