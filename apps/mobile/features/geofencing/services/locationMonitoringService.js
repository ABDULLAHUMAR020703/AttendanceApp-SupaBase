/**
 * Location Monitoring Service
 * Monitors user location every 60 seconds and automatically checks out
 * if user leaves the 1km office radius while checked in
 */
import * as Location from 'expo-location';
import { getCurrentLocation, getOfficeLocation, findMatchingAllowedLocation } from './geofenceService';
import { isWithin1km, getDistanceInMeters, formatDistance } from '../utils/distance';
import { normalizeWorkMode, shouldMonitorGeofenceWhileCheckedIn } from '../utils/workModeRules';
import { getUserAttendanceRecords, saveAttendanceRecord } from '../../../utils/storage';
import { getCurrentLocationWithAddress } from '../../../utils/location';
import { isAutoCheckoutEnabled } from '../../attendance/services/attendanceConfigService';
import { supabase } from '../../../core/config/supabase';
import * as Notifications from 'expo-notifications';

// Monitoring state
let monitoringInterval = null;
let isMonitoring = false;
let currentUser = null;
let lastKnownLocationState = null; // 'inside' | 'outside' | null
let lastAutoCheckoutTime = null; // Prevent duplicate checkouts
let activeCheckInLocation = null; // Site monitored after check-in
let consecutiveGpsFailures = 0;

/**
 * Configure notification channel for automatic checkout alerts
 */
const configureNotifications = async () => {
  try {
    // Request notification permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[LocationMonitoring] Notification permissions not granted');
      return false;
    }

    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    return true;
  } catch (error) {
    console.error('[LocationMonitoring] Error configuring notifications:', error);
    return false;
  }
};

/**
 * Send notification to user
 */
const sendNotification = async (title, body) => {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: null, // Show immediately
    });
  } catch (error) {
    console.error('[LocationMonitoring] Error sending notification:', error);
  }
};

/**
 * Get the last attendance record for a user
 * @param {string} username - Username
 * @returns {Promise<Object|null>} Last attendance record or null
 */
const getLastAttendanceRecord = async (username) => {
  try {
    const records = await getUserAttendanceRecords(username);
    if (records && records.length > 0) {
      // Records are already sorted by timestamp DESC
      return records[0];
    }
    return null;
  } catch (error) {
    console.error('[LocationMonitoring] Error getting last attendance record:', error);
    return null;
  }
};

/**
 * Check if user is currently checked in
 * @param {string} username - Username
 * @returns {Promise<boolean>} True if user is checked in
 */
const isUserCheckedIn = async (username) => {
  try {
    const lastRecord = await getLastAttendanceRecord(username);
    return lastRecord && lastRecord.type === 'checkin';
  } catch (error) {
    console.error('[LocationMonitoring] Error checking if user is checked in:', error);
    return false;
  }
};

/**
 * Send notification to manager about employee auto checkout
 */
const notifyManager = async (employee, distance) => {
  try {
    // Get employee's manager
    let managerQuery = supabase
      .from('users')
      .select('uid, username, name, email')
      .eq('role', 'manager')
      .eq('is_active', true)
      .limit(1);

    if (employee.companyId || employee.company_id) {
      managerQuery = managerQuery.eq('company_id', employee.companyId || employee.company_id);
    }
    if (employee.departmentId || employee.department_id) {
      managerQuery = managerQuery.eq('department_id', employee.departmentId || employee.department_id);
    } else if (employee.department) {
      managerQuery = managerQuery.eq('department', employee.department);
    }

    const { data: managerData, error } = await managerQuery.maybeSingle();

    if (error || !managerData) {
      console.warn('[LocationMonitoring] Could not find manager for department:', employee.department);
      return;
    }

    // Create notification in database
    const { error: notifError } = await supabase.rpc('create_notification', {
      p_recipient_uid: managerData.uid || null,
      p_recipient_username: managerData.username,
      p_title: 'Employee Auto Check-Out',
      p_body: `${employee.name || employee.username} was automatically checked out after leaving the office area (${formatDistance(distance)} away).`,
      p_type: 'attendance',
      p_data: {
        type: 'auto_checkout',
        employee_username: employee.username,
        employee_name: employee.name || employee.username,
        distance: distance,
        timestamp: new Date().toISOString(),
      },
    });

    if (notifError) {
      console.error('[LocationMonitoring] Error creating manager notification:', notifError);
    } else {
      console.log('[LocationMonitoring] Manager notification sent to:', managerData.username);
    }
  } catch (error) {
    console.error('[LocationMonitoring] Error notifying manager:', error);
  }
};

/**
 * Automatically check out user
 * @param {Object} user - User object
 * @param {Object} location - Current location
 * @param {number} distance - Distance from office in meters
 * @returns {Promise<boolean>} True if checkout successful
 */
const performAutomaticCheckout = async (user, location, distance) => {
  try {
    // Prevent duplicate checkouts (within 2 minutes)
    const now = Date.now();
    if (lastAutoCheckoutTime && (now - lastAutoCheckoutTime) < 120000) {
      console.log('[LocationMonitoring] Skipping duplicate auto checkout (recent checkout detected)');
      return false;
    }

    console.log('[LocationMonitoring] Performing automatic checkout:', {
      username: user.username,
      distance: `${distance.toFixed(0)}m`,
    });

    // Get current location with address
    const locationData = location || await getCurrentLocationWithAddress();

    const attendanceRecord = {
      id: Date.now().toString(),
      username: user.username,
      type: 'checkout',
      timestamp: new Date().toISOString(),
      photo: null,
      location: {
        ...locationData,
        distance_from_office: distance,
        checkout_reason: 'AUTO_CHECKOUT_OUTSIDE_RADIUS',
      },
      authMethod: 'automatic_geofence',
      isManual: false,
    };

    // Save checkout record
    const saveResult = await saveAttendanceRecord(attendanceRecord);

    if (saveResult?.success && saveResult.record) {
      lastAutoCheckoutTime = now;
      const result = saveResult.record;

      // Log the event
      console.log('[LocationMonitoring] ✓ Automatic checkout successful:', {
        username: user.username,
        recordId: result.id || attendanceRecord.id,
        synced: saveResult.source === 'supabase',
        distance: `${distance.toFixed(0)}m`,
        timestamp: attendanceRecord.timestamp,
        location: {
          latitude: locationData.latitude,
          longitude: locationData.longitude,
        },
      });

      // Notify user
      const distanceFormatted = formatDistance(distance);
      await sendNotification(
        'Automatic Check-Out',
        `You have been automatically checked out because you left the office area. You were ${distanceFormatted} away from the office.`
      );

      // Notify manager
      await notifyManager(user, distance);

      // Update state
      lastKnownLocationState = 'outside';

      return true;
    }

    return false;
  } catch (error) {
    console.error('[LocationMonitoring] Error performing automatic checkout:', error);
    return false;
  }
};

/**
 * Initialize monitoring state immediately after a successful check-in.
 * @param {Object} user
 * @param {Object|null} matchedLocation - Location validated at check-in
 */
export const resetMonitoringAfterCheckIn = async (user, matchedLocation = null) => {
  activeCheckInLocation = matchedLocation || null;
  lastKnownLocationState = 'inside';
  consecutiveGpsFailures = 0;
  currentUser = user;

  if (shouldMonitorGeofenceWhileCheckedIn(user) && !isMonitoring) {
    await startLocationMonitoring(user);
  }
};

const resolveMonitoringLocation = async (user) => {
  if (activeCheckInLocation?.latitude && activeCheckInLocation?.longitude) {
    return activeCheckInLocation;
  }
  return getOfficeLocation(user);
};

const isWithinMonitoringRadius = (currentLocation, monitorLocation) => {
  if (!currentLocation || !monitorLocation) return true;

  const distance = getDistanceInMeters(
    currentLocation.latitude,
    currentLocation.longitude,
    monitorLocation.latitude,
    monitorLocation.longitude
  );
  const radiusM = monitorLocation.radius_meters || monitorLocation.radius || 1000;
  if (radiusM === 1000) {
    return isWithin1km(
      currentLocation.latitude,
      currentLocation.longitude,
      monitorLocation.latitude,
      monitorLocation.longitude
    );
  }
  return distance <= radiusM;
};

/**
 * Check location and perform automatic checkout if needed
 * @param {Object} user - User object
 * @returns {Promise<{isInside: boolean, distance?: number}>}
 */
const checkLocationAndCheckout = async (user) => {
  try {
    if (!shouldMonitorGeofenceWhileCheckedIn(user)) {
      return { isInside: true };
    }

    const checkedIn = await isUserCheckedIn(user.username);
    if (!checkedIn) {
      lastKnownLocationState = null;
      activeCheckInLocation = null;
      return { isInside: true };
    }

    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[LocationMonitoring] Location permission revoked');
      await sendNotification(
        'Location Permission Required',
        'Location permission is required for attendance monitoring. Please enable it in settings.'
      );
      return { isInside: null };
    }

    const currentLocation = await getCurrentLocation();
    if (!currentLocation?.latitude || !currentLocation?.longitude) {
      consecutiveGpsFailures += 1;
      console.warn('[LocationMonitoring] Unable to get current location');
      if (consecutiveGpsFailures >= 3) {
        await sendNotification(
          'Location Unavailable',
          'We could not read your GPS while you are checked in. Move to an open area or enable location services.'
        );
      }
      return { isInside: null };
    }
    consecutiveGpsFailures = 0;

    let monitorLocation = await resolveMonitoringLocation(user);
    if (!monitorLocation && currentLocation.latitude && currentLocation.longitude) {
      const { match } = await findMatchingAllowedLocation(
        user,
        currentLocation.latitude,
        currentLocation.longitude
      );
      if (match) {
        activeCheckInLocation = match;
        monitorLocation = match;
        lastKnownLocationState = 'inside';
      }
    }

    if (!monitorLocation) {
      console.warn('[LocationMonitoring] No monitoring location configured');
      return { isInside: true };
    }

    const distance = getDistanceInMeters(
      currentLocation.latitude,
      currentLocation.longitude,
      monitorLocation.latitude,
      monitorLocation.longitude
    );

    const isWithinRadius = isWithinMonitoringRadius(currentLocation, monitorLocation);

    const previousState = lastKnownLocationState;
    lastKnownLocationState = isWithinRadius ? 'inside' : 'outside';

    if (!isWithinRadius && (previousState === 'inside' || previousState === null)) {
      console.log('[LocationMonitoring] User left allowed radius:', {
        username: user.username,
        distance: `${distance.toFixed(0)}m`,
        site: monitorLocation.name,
      });

      const autoCheckoutEnabled = await isAutoCheckoutEnabled(true);

      if (autoCheckoutEnabled) {
        const success = await performAutomaticCheckout(user, currentLocation, distance);
        if (success) {
          console.log('[LocationMonitoring] Auto checkout successful, stopping monitoring');
          stopLocationMonitoring();
          return { isInside: false, distance };
        }
      } else {
        const distanceFormatted = formatDistance(distance);
        await sendNotification(
          'Outside Allowed Work Area',
          `You are ${distanceFormatted} away from ${monitorLocation.name || 'your work site'}. Manual checkout is blocked until you return.`
        );
      }
    } else if (isWithinRadius && previousState === 'outside') {
      console.log('[LocationMonitoring] User re-entered allowed radius:', user.username);
      await sendNotification(
        'Back in Work Area',
        `You have returned to ${monitorLocation.name || 'your work site'}. You can check out manually if needed.`
      );
    }

    return {
      isInside: isWithinRadius,
      distance,
    };
  } catch (error) {
    console.error('[LocationMonitoring] Error in location check:', error);
    return { isInside: null };
  }
};

/**
 * Start location monitoring for a user
 * @param {Object} user - User object
 * @returns {Promise<boolean>} True if monitoring started successfully
 */
export const startLocationMonitoring = async (user) => {
  try {
    // Stop any existing monitoring
    if (isMonitoring) {
      stopLocationMonitoring();
    }

    // Configure notifications
    await configureNotifications();

    // Request location permissions
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[LocationMonitoring] Location permission not granted');
      return false;
    }

    currentUser = user;

    // Perform initial check
    await checkLocationAndCheckout(user);
    
    // Only start monitoring if user is still checked in
    const stillCheckedIn = await isUserCheckedIn(user.username);
    if (!stillCheckedIn) {
      console.log('[LocationMonitoring] User not checked in, skipping monitoring start');
      return true;
    }

    // Start periodic monitoring (every 60 seconds)
    monitoringInterval = setInterval(async () => {
      if (!currentUser) {
        return;
      }

      // Check if user is still checked in before monitoring
      const checkedIn = await isUserCheckedIn(currentUser.username);
      if (!checkedIn) {
        console.log('[LocationMonitoring] User checked out, stopping monitoring');
        stopLocationMonitoring();
        return;
      }

      // Check location and handle accordingly
      await checkLocationAndCheckout(currentUser);
    }, 30000); // 30 seconds

    isMonitoring = true;
    console.log('[LocationMonitoring] ✓ Location monitoring started for user:', user.username);

    return true;
  } catch (error) {
    console.error('[LocationMonitoring] Error starting location monitoring:', error);
    return false;
  }
};

/**
 * Update the in-memory user used by an already-running monitor (e.g. workMode / profile refresh)
 * without tearing down the interval. No-op if monitoring is not active.
 * @param {Object} user
 */
export const updateLocationMonitoringUser = (user) => {
  if (isMonitoring && user) {
    currentUser = user;
  }
};

/**
 * Stop location monitoring
 */
export const stopLocationMonitoring = () => {
  try {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
    }

    isMonitoring = false;
    currentUser = null;
    lastKnownLocationState = null;
    lastAutoCheckoutTime = null;
    activeCheckInLocation = null;
    consecutiveGpsFailures = 0;
    console.log('[LocationMonitoring] ✓ Location monitoring stopped');
  } catch (error) {
    console.error('[LocationMonitoring] Error stopping location monitoring:', error);
  }
};

/**
 * Get current location state (inside/outside radius)
 * @returns {Promise<{isInside: boolean | null, distance?: number}>}
 */
export const getCurrentLocationState = async () => {
  if (!currentUser) {
    return { isInside: null };
  }

  return await checkLocationAndCheckout(currentUser);
};

/**
 * Check if monitoring is active
 * @returns {boolean} True if monitoring is active
 */
export const isLocationMonitoringActive = () => {
  return isMonitoring;
};

/**
 * Get current monitoring user
 * @returns {Object|null} Current user or null
 */
export const getMonitoringUser = () => {
  return currentUser;
};
