/**
 * Pure validation helpers for geofence sites — shared by create and update.
 * Units: metres. Uniqueness rule: (company_id, department_id, name).
 */
const SITE_RADIUS_MAX = 100000;

/** @returns {string|null} error message, or null when the geometry is valid */
function validateSiteGeometry({ latitude, longitude, radius }) {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    return 'Latitude must be between -90 and 90';
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return 'Longitude must be between -180 and 180';
  }
  if (Math.abs(latitude) < 0.0001 && Math.abs(longitude) < 0.0001) {
    return 'Coordinates (0, 0) are not a valid location';
  }
  if (!Number.isFinite(radius) || radius <= 0 || radius > SITE_RADIUS_MAX) {
    return `Radius must be between 1 and ${SITE_RADIUS_MAX} metres`;
  }
  return null;
}

/** Postgres unique-violation detector (used to turn 23505 into a 409). */
function isUniqueViolation(err) {
  return (
    err?.code === '23505' ||
    /duplicate key value|unique constraint/i.test(err?.message || '')
  );
}

/** Case-insensitive, whitespace-collapsed site-name key. */
function siteNameKey(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

module.exports = { SITE_RADIUS_MAX, validateSiteGeometry, isUniqueViolation, siteNameKey };
