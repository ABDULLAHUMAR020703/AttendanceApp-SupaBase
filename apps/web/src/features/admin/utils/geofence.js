const EARTH_RADIUS_M = 6371000;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function haversineMeters(lat1, lon1, lat2, lon2) {
  const aLat = Number(lat1);
  const aLon = Number(lon1);
  const bLat = Number(lat2);
  const bLon = Number(lon2);
  if (![aLat, aLon, bLat, bLon].every(Number.isFinite)) return Infinity;
  if (aLat < -90 || aLat > 90 || bLat < -90 || bLat > 90) return Infinity;
  if (aLon < -180 || aLon > 180 || bLon < -180 || bLon > 180) return Infinity;

  const dLat = toRadians(bLat - aLat);
  const dLon = toRadians(bLon - aLon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(aLat)) * Math.cos(toRadians(bLat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function parseLatitude(value) {
  const lat = Number(value);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  return lat;
}

export function parseLongitude(value) {
  const lng = Number(value);
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return null;
  return lng;
}

/** The (0, 0) pair is the null-island reading — never a real configured office. */
export function isNullIsland(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001;
}

/** Largest radius a site geofence may use, in metres. */
export const MAX_RADIUS_METERS = 100000;

export function hasValidCoordinates(site) {
  if (parseLatitude(site?.latitude) == null || parseLongitude(site?.longitude) == null) return false;
  return !isNullIsland(site.latitude, site.longitude);
}

/** Keep in-progress typing (e.g. "-" / "33.") but reject completed values outside [min, max]. */
export function acceptBoundedNumber(raw, min, max) {
  const value = String(raw ?? '');
  if (value === '' || value === '-' || value === '.' || value === '-.') return value;
  if (!/^-?\d*\.?\d*$/.test(value)) return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < min || num > max) return null;
  return value;
}

export function wrapLongitude(value) {
  const lng = Number(value);
  if (!Number.isFinite(lng)) return null;
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

export function coordinateErrors(latitude, longitude) {
  const errors = {};
  if (latitude === '' || latitude == null) errors.latitude = 'Latitude is required.';
  else if (parseLatitude(latitude) == null) errors.latitude = 'Latitude must be between -90 and 90.';
  if (longitude === '' || longitude == null) errors.longitude = 'Longitude is required.';
  else if (parseLongitude(longitude) == null) errors.longitude = 'Longitude must be between -180 and 180.';
  if (!errors.latitude && !errors.longitude && isNullIsland(latitude, longitude)) {
    errors.latitude = 'Coordinates (0, 0) are not a valid location. Pick a point on the map.';
  }
  return errors;
}

export function normalizeSiteName(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Uniqueness rule matches the DB: UNIQUE(company_id, department_id, name).
 * A clash is only a clash within the SAME department. Pass `departmentId` to
 * scope the check; omit it to fall back to an account-wide check (legacy).
 */
export function findDuplicateSiteName(sites, name, { ignoreId, departmentId } = {}) {
  const target = normalizeSiteName(name);
  if (!target) return null;
  return (
    (sites || []).find((site) => {
      if (ignoreId && String(site.id) === String(ignoreId)) return false;
      if (departmentId != null && String(site.department_id) !== String(departmentId)) return false;
      return normalizeSiteName(site.name) === target;
    }) || null
  );
}

export function geofencesOverlap(a, b) {
  const radiusA = Number(a?.radius);
  const radiusB = Number(b?.radius);
  if (!Number.isFinite(radiusA) || !Number.isFinite(radiusB) || radiusA <= 0 || radiusB <= 0) return false;
  const distance = haversineMeters(a.latitude, a.longitude, b.latitude, b.longitude);
  return distance <= radiusA + radiusB;
}

export function overlappingPartners(sites, site) {
  if (!site) return [];
  return (sites || []).filter((other) => other.id !== site.id && geofencesOverlap(site, other));
}

export function overlapMap(sites) {
  const byId = new Map();
  const list = Array.isArray(sites) ? sites : [];
  for (const site of list) {
    const partners = overlappingPartners(list, site);
    if (partners.length) byId.set(site.id, partners);
  }
  return byId;
}
