import { WORK_MODES } from '../../../shared/constants/workModes';

/**
 * Normalize work mode from user profile (handles hyphens, spaces, casing).
 * @param {object|null} user
 * @returns {string}
 */
export function normalizeWorkMode(user) {
  const raw = user?.workMode ?? user?.work_mode ?? WORK_MODES.IN_OFFICE;
  return String(raw).toLowerCase().replace(/-/g, '_').replace(/\s+/g, '_');
}

export function isFullyRemote(user) {
  return normalizeWorkMode(user) === WORK_MODES.FULLY_REMOTE;
}

export function isSemiRemote(user) {
  return normalizeWorkMode(user) === WORK_MODES.SEMI_REMOTE;
}

export function isInOffice(user) {
  return normalizeWorkMode(user) === WORK_MODES.IN_OFFICE;
}

/** Whether GPS coordinates are required before check-in. */
export function isLocationRequiredForCheckIn(user) {
  return !isFullyRemote(user);
}

/** Whether geofence radius should be enforced for check-in. */
export function requiresGeofenceForCheckIn(user) {
  return isInOffice(user) || isSemiRemote(user);
}

/** Whether automatic geofence checkout monitoring applies while checked in. */
export function shouldMonitorGeofenceWhileCheckedIn(user) {
  return isInOffice(user) || isSemiRemote(user);
}
