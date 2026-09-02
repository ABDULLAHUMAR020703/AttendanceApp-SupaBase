/**
 * Pure-logic tests for the web geofence helpers.
 * Run: node --test apps/web/src/features/admin/utils/geofence.test.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineMeters,
  parseLatitude,
  parseLongitude,
  isNullIsland,
  hasValidCoordinates,
  findDuplicateSiteName,
  geofencesOverlap,
  MAX_RADIUS_METERS,
} from './geofence.js';

test('haversineMeters: known distance (~111.19 km per degree of latitude)', () => {
  const d = haversineMeters(0, 0, 1, 0);
  assert.ok(Math.abs(d - 111195) < 50, `expected ~111195 m, got ${d}`);
});

test('haversineMeters: zero distance', () => {
  assert.equal(haversineMeters(24.86, 67.0, 24.86, 67.0), 0);
});

test('haversineMeters: rejects non-finite / out of range with Infinity', () => {
  assert.equal(haversineMeters(NaN, 0, 0, 0), Infinity);
  assert.equal(haversineMeters(0, 0, 91, 0), Infinity);
  assert.equal(haversineMeters(0, 0, 0, 181), Infinity);
});

test('parseLatitude / parseLongitude ranges', () => {
  assert.equal(parseLatitude('45'), 45);
  assert.equal(parseLatitude('-90'), -90);
  assert.equal(parseLatitude('90.1'), null);
  assert.equal(parseLatitude('abc'), null);
  assert.equal(parseLongitude('180'), 180);
  assert.equal(parseLongitude('-181'), null);
  assert.equal(parseLongitude('Infinity'), null);
});

test('isNullIsland: only the (0,0) pair', () => {
  assert.equal(isNullIsland(0, 0), true);
  assert.equal(isNullIsland('0', '0'), true);
  assert.equal(isNullIsland(0, 12), false);
  assert.equal(isNullIsland(51.5, 0), false); // Greenwich — lon 0 is real
});

test('hasValidCoordinates rejects null island and out-of-range', () => {
  assert.equal(hasValidCoordinates({ latitude: 24.8, longitude: 67 }), true);
  assert.equal(hasValidCoordinates({ latitude: 0, longitude: 0 }), false);
  assert.equal(hasValidCoordinates({ latitude: 200, longitude: 0 }), false);
});

test('findDuplicateSiteName is department-scoped', () => {
  const sites = [
    { id: 'a', name: 'Office', department_id: 'hr' },
    { id: 'b', name: 'Warehouse', department_id: 'ops' },
  ];
  // Same name, different department -> allowed (no clash)
  assert.equal(findDuplicateSiteName(sites, 'Office', { departmentId: 'ops' }), null);
  // Same name, same department -> clash
  assert.equal(findDuplicateSiteName(sites, 'office', { departmentId: 'hr' })?.id, 'a');
  // Editing the same row -> ignored
  assert.equal(findDuplicateSiteName(sites, 'Office', { departmentId: 'hr', ignoreId: 'a' }), null);
  // No departmentId -> account-wide legacy check
  assert.equal(findDuplicateSiteName(sites, 'office')?.id, 'a');
});

test('geofencesOverlap uses inclusive radius sum', () => {
  const a = { latitude: 0, longitude: 0, radius: 100 };
  const b = { latitude: 0, longitude: 0.001, radius: 50 }; // ~111 m apart
  assert.equal(geofencesOverlap(a, b), true);
  const far = { latitude: 0, longitude: 1, radius: 50 };
  assert.equal(geofencesOverlap(a, far), false);
});

test('MAX_RADIUS_METERS is 100000', () => {
  assert.equal(MAX_RADIUS_METERS, 100000);
});
