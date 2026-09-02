/**
 * Run: node --test services/auth-service/test/siteValidation.test.cjs
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SITE_RADIUS_MAX,
  validateSiteGeometry,
  isUniqueViolation,
  siteNameKey,
} = require('../lib/siteValidation');

test('accepts a valid site', () => {
  assert.equal(validateSiteGeometry({ latitude: 24.86, longitude: 67.0, radius: 150 }), null);
});

test('rejects out-of-range latitude/longitude', () => {
  assert.match(validateSiteGeometry({ latitude: 91, longitude: 0, radius: 10 }), /Latitude/);
  assert.match(validateSiteGeometry({ latitude: 0, longitude: 181, radius: 10 }), /Longitude/);
});

test('rejects NaN / Infinity coordinates and radius', () => {
  assert.match(validateSiteGeometry({ latitude: NaN, longitude: 0, radius: 10 }), /Latitude/);
  assert.match(validateSiteGeometry({ latitude: 1, longitude: Infinity, radius: 10 }), /Longitude/);
  assert.match(validateSiteGeometry({ latitude: 1, longitude: 1, radius: NaN }), /Radius/);
});

test('rejects the (0,0) null island', () => {
  assert.match(validateSiteGeometry({ latitude: 0, longitude: 0, radius: 100 }), /\(0, 0\)/);
});

test('rejects radius <= 0 and > max', () => {
  assert.match(validateSiteGeometry({ latitude: 1, longitude: 1, radius: 0 }), /Radius/);
  assert.match(validateSiteGeometry({ latitude: 1, longitude: 1, radius: -5 }), /Radius/);
  assert.match(
    validateSiteGeometry({ latitude: 1, longitude: 1, radius: SITE_RADIUS_MAX + 1 }),
    /Radius/
  );
  assert.equal(validateSiteGeometry({ latitude: 1, longitude: 1, radius: SITE_RADIUS_MAX }), null);
});

test('isUniqueViolation detects 23505', () => {
  assert.equal(isUniqueViolation({ code: '23505' }), true);
  assert.equal(isUniqueViolation({ message: 'duplicate key value violates unique constraint' }), true);
  assert.equal(isUniqueViolation({ code: '23503' }), false);
});

test('siteNameKey normalises case and whitespace', () => {
  assert.equal(siteNameKey('  Head   Office '), 'head office');
  assert.equal(siteNameKey('HEAD OFFICE'), 'head office');
});
