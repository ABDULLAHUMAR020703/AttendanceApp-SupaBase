/**
 * Server-side permission checks — catalog lives in shared/permissions/catalog.cjs
 */
const catalog = require('../../../shared/permissions/catalog.cjs');
const {
  MANAGER_PERMISSION_GROUPS,
  ALL_MANAGER_PERMISSIONS,
  DEFAULT_MANAGER_PERMISSIONS,
  TENANT_WIDE_PEOPLE_PERMISSIONS,
  FEATURE_PERMISSIONS,
  normalizePermissionKey,
} = catalog;

const SELF_PROTECTION_ERROR = 'You cannot modify your own administrative access.';

async function getManagerPermissions(supabase, managerUid) {
  if (!managerUid) return [];
  const { data, error } = await supabase
    .from('manager_permissions')
    .select('permission_key, granted')
    .eq('manager_uid', managerUid);
  if (error) throw error;
  return (data || [])
    .filter((row) => row.granted === true && ALL_MANAGER_PERMISSIONS.includes(row.permission_key))
    .map((row) => row.permission_key);
}

async function hasPermission(supabase, requester, permissionKey) {
  if (!requester?.role) return false;
  if (requester.role === 'super_admin') return true;
  const key = normalizePermissionKey(permissionKey);
  if (!ALL_MANAGER_PERMISSIONS.includes(key)) return false;
  const { data, error } = await supabase
    .from('manager_permissions')
    .select('granted')
    .eq('manager_uid', requester.uid)
    .eq('permission_key', key)
    .maybeSingle();
  if (error) throw error;
  return data?.granted === true;
}

async function hasAnyPermission(supabase, requester, permissionKeys = []) {
  if (!requester?.role) return false;
  if (requester.role === 'super_admin') return true;
  const keys = permissionKeys.map(normalizePermissionKey).filter((key) => ALL_MANAGER_PERMISSIONS.includes(key));
  if (keys.length === 0) return false;
  const { data, error } = await supabase
    .from('manager_permissions')
    .select('permission_key, granted')
    .eq('manager_uid', requester.uid)
    .in('permission_key', keys);
  if (error) throw error;
  return (data || []).some((row) => row.granted === true);
}

async function requirePermission(supabase, requester, permissionKey, res) {
  const allowed = await hasPermission(supabase, requester, permissionKey);
  if (!allowed) {
    res.status(403).json({ success: false, error: `Permission required: ${permissionKey}` });
    return false;
  }
  return true;
}

function rejectSelfAdministrativeChange(requester, targetUid, res) {
  if (requester?.uid && targetUid && String(requester.uid) === String(targetUid)) {
    res.status(403).json({ success: false, error: SELF_PROTECTION_ERROR });
    return true;
  }
  return false;
}

async function writeAuditLog(supabase, { actorUid, targetUid, action }) {
  if (!actorUid || !targetUid || !action) return;
  const { error } = await supabase.from('audit_logs').insert({
    actor_uid: actorUid,
    target_uid: targetUid,
    action,
  });
  if (error) {
    console.warn('[audit_logs] write failed:', error.message);
  }
}

module.exports = {
  ...catalog,
  MANAGER_PERMISSION_GROUPS,
  ALL_MANAGER_PERMISSIONS,
  DEFAULT_MANAGER_PERMISSIONS,
  TENANT_WIDE_PEOPLE_PERMISSIONS,
  FEATURE_PERMISSIONS,
  SELF_PROTECTION_ERROR,
  getManagerPermissions,
  hasPermission,
  hasAnyPermission,
  requirePermission,
  rejectSelfAdministrativeChange,
  writeAuditLog,
};
