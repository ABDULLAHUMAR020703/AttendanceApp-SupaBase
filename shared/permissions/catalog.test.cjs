/**
 * Authorization catalog tests.
 * Run: node --test shared/permissions/catalog.test.cjs
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  hasPermission,
  hasAnyPermission,
  canAccessFeature,
  isSuperAdmin,
} = require('./catalog.cjs');

const employee = { role: 'employee', permissions: [] };
const managerNoPerm = { role: 'manager', permissions: [] };
const managerGeo = { role: 'manager', permissions: ['manage_geofencing'] };
const superAdmin = { role: 'super_admin' };

test('employee has no admin permissions and no geofencing feature', () => {
  assert.equal(hasPermission(employee, 'manage_geofencing'), false);
  assert.equal(canAccessFeature(employee, 'sites'), false);
  assert.equal(isSuperAdmin(employee), false);
});

test('manager needs the explicit grant', () => {
  assert.equal(hasPermission(managerNoPerm, 'manage_geofencing'), false);
  assert.equal(canAccessFeature(managerNoPerm, 'sites'), false);
  assert.equal(hasPermission(managerGeo, 'manage_geofencing'), true);
  assert.equal(canAccessFeature(managerGeo, 'sites'), true);
});

test('super_admin bypasses the catalog', () => {
  assert.equal(hasPermission(superAdmin, 'manage_geofencing'), true);
  assert.equal(canAccessFeature(superAdmin, 'sites'), true);
  assert.equal(isSuperAdmin(superAdmin), true);
});

test('unknown permission keys are rejected', () => {
  assert.equal(hasPermission(managerGeo, 'not_a_real_key'), false);
  assert.equal(hasAnyPermission(managerGeo, ['not_a_real_key']), false);
});

test('null / undefined user is denied', () => {
  assert.equal(hasPermission(null, 'manage_geofencing'), false);
  assert.equal(canAccessFeature(undefined, 'sites'), false);
});
