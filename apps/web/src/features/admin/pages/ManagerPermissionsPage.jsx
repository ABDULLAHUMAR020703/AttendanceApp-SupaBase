import { useEffect, useMemo, useState } from 'react';
import { History, SearchX } from 'lucide-react';
import { adminService } from '../services/adminService';
import {
  allManagerPermissions,
  defaultManagerPermissions,
  managerPermissionGroups,
} from '../permissions';
import {
  GlassTable,
  TableCell,
  TableIdentity,
  TableRow,
} from '../../../shared/components/GlassTable';
import { Alert } from '../../../shared/components/ui/Alert';
import { EmptyStateBody } from '../../../shared/components/ui/EmptyState';

const VIEWS = [
  { id: 'roles', label: 'Roles' },
  { id: 'users', label: 'Users' },
  { id: 'permissions', label: 'Permissions' },
];

const ROLE_CATALOG = [
  {
    id: 'employee',
    name: 'Employee',
    description:
      'Records attendance and submits requests. Permission grants stored for this role do not open the admin console.',
  },
  {
    id: 'manager',
    name: 'Manager',
    description:
      'Admin-console access is evaluated from each person’s grant list. The matrix below is the manager default until you override it for a user.',
  },
  {
    id: 'super_admin',
    name: 'Super admin',
    description: 'Unrestricted access to every module. Super-admin rights cannot be reduced on this screen.',
  },
];

function roleLabel(value) {
  const hit = ROLE_CATALOG.find((role) => role.id === value);
  return hit?.name || String(value || '').replace(/_/g, ' ');
}

function formatWhen(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function defaultSetForRole(roleId) {
  if (roleId === 'super_admin') return new Set(allManagerPermissions);
  if (roleId === 'manager') return new Set(defaultManagerPermissions);
  return new Set();
}

function samePermissionSet(a, b) {
  if (a.size !== b.size) return false;
  for (const key of a) {
    if (!b.has(key)) return false;
  }
  return true;
}

export function ManagerPermissionsPage() {
  const [view, setView] = useState('roles');
  const [managers, setManagers] = useState([]);
  const [directory, setDirectory] = useState([]);
  const [selectedUid, setSelectedUid] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('manager');
  const [permissionSet, setPermissionSet] = useState(new Set());
  const [search, setSearch] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedManager = managers.find((row) => row.uid === selectedUid) || null;

  const filteredManagers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return managers;
    return managers.filter((row) =>
      `${row.name || ''} ${row.username || ''} ${row.email || ''} ${row.department || ''} ${row.role || ''}`
        .toLowerCase()
        .includes(query)
    );
  }, [managers, search]);

  const usersByRole = useMemo(
    () => ({
      employee: managers.filter((row) => row.role === 'employee'),
      manager: managers.filter((row) => row.role === 'manager'),
      super_admin: directory.filter((row) => row.role === 'super_admin'),
    }),
    [managers, directory]
  );

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [managerRows, logs, userRows] = await Promise.all([
        adminService.getManagers(),
        adminService.getAuditLogs().catch(() => []),
        adminService.getUsers().catch(() => []),
      ]);
      const rows = managerRows || [];
      setManagers(rows);
      setAuditLogs(logs || []);
      setDirectory(userRows || []);
      setSelectedUid((current) => {
        if (current && rows.some((row) => row.uid === current)) return current;
        return rows[0]?.uid || '';
      });
    } catch (err) {
      setError(err?.message || 'Failed to load user permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const manager = managers.find((row) => row.uid === selectedUid);
    if (manager) setPermissionSet(new Set(manager.permissions || []));
  }, [selectedUid, managers]);

  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => setMessage(''), 2500);
    return () => clearTimeout(timer);
  }, [message]);

  const togglePermission = (key) => {
    setPermissionSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleGroup = (keys, grant) => {
    setPermissionSet((prev) => {
      const next = new Set(prev);
      for (const key of keys) {
        if (grant) next.add(key);
        else next.delete(key);
      }
      return next;
    });
  };

  const save = async () => {
    if (!selectedManager) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const permissions = Array.from(permissionSet);
      await adminService.updateManagerPermissions(selectedManager.uid, permissions);
      setManagers((prev) =>
        prev.map((row) => (row.uid === selectedManager.uid ? { ...row, permissions } : row))
      );
      setMessage('Permissions saved.');
      const logs = await adminService.getAuditLogs().catch(() => []);
      setAuditLogs(logs || []);
    } catch (err) {
      setError(err?.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const grantedCount = permissionSet.size;
  const savedSet = new Set(selectedManager?.permissions || []);
  const dirty = Boolean(selectedManager) && !samePermissionSet(permissionSet, savedSet);
  const selectedRole = ROLE_CATALOG.find((role) => role.id === selectedRoleId);
  const roleUsers = usersByRole[selectedRoleId] || [];
  const roleAccess = defaultSetForRole(selectedRoleId);

  const openUserPermissions = (uid) => {
    setSelectedUid(uid);
    setView('permissions');
  };

  return (
    <div className="permissions-directory admin-page gap-4 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Permissions</h1>
        <p className="mt-1 text-sm text-slate-500">Review role access, then assign grants to individual users.</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {message && <Alert type="success">{message}</Alert>}

      <div className="ui-segment" role="tablist" aria-label="Access control">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={view === item.id}
            onClick={() => setView(item.id)}
            className={`ui-segment-item ${view === item.id ? 'ui-segment-item-active' : ''}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {view === 'roles' && (
        <div className="admin-fill grid min-h-0 gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {ROLE_CATALOG.map((role) => {
              const active = role.id === selectedRoleId;
              const count = (usersByRole[role.id] || []).length;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`permissions-rail-item w-full text-left ${active ? 'is-active' : ''}`}
                >
                  <span className="block text-sm font-medium text-slate-900">{role.name}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">
                    {loading ? '—' : count === 1 ? '1 person' : `${count} people`}
                  </span>
                </button>
              );
            })}
          </aside>

          {selectedRole && (
            <section className="min-h-0 overflow-auto rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">{selectedRole.name}</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-500">{selectedRole.description}</p>
              <p className="mt-3 text-sm text-slate-600">
                {selectedRoleId === 'employee' && `No admin-console access · 0 of ${allManagerPermissions.length} permissions`}
                {selectedRoleId === 'manager' &&
                  `${roleAccess.size} of ${allManagerPermissions.length} permissions by default`}
                {selectedRoleId === 'super_admin' && `All ${allManagerPermissions.length} permissions`}
              </p>

              <h3 className="permissions-section-label">Assigned users</h3>
              {roleUsers.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">
                  {selectedRoleId === 'super_admin'
                    ? 'Super-admin accounts are not edited from this screen.'
                    : 'No one with this role is in the access list yet.'}
                </p>
              ) : (
                <ul className="permissions-user-list mt-2">
                  {roleUsers.map((row) => (
                    <li key={row.uid}>
                      {row.role === 'super_admin' ? (
                        <div className="permissions-user-row">
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-slate-800">{row.name || row.username}</span>
                            <span className="block truncate text-xs text-slate-400">
                              {row.department || row.email || row.username}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-slate-400">Full access</span>
                        </div>
                      ) : (
                        <button type="button" onClick={() => openUserPermissions(row.uid)} className="permissions-user-row">
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-slate-800">{row.name || row.username}</span>
                            <span className="block truncate text-xs text-slate-400">
                              {row.department || row.email || row.username}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-slate-400">
                            {(row.permissions || []).length} granted
                          </span>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <h3 className="permissions-section-label">Permissions</h3>
              <p className="mt-1 mb-3 text-xs text-slate-400">
                {selectedRoleId === 'manager'
                  ? 'Module totals reflect the manager default. Open a group to see each grant.'
                  : 'Open a module to see which grants are included.'}
              </p>
              <PermissionMatrix value={roleAccess} readOnly />
            </section>
          )}
        </div>
      )}

      {view === 'users' && (
        <div className="admin-fill grid min-h-0 gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <UserRail
            loading={loading}
            search={search}
            onSearch={setSearch}
            rows={filteredManagers}
            selectedUid={selectedUid}
            onSelect={setSelectedUid}
          />
          <section className="min-h-0 overflow-auto rounded-xl border border-slate-200 bg-white p-5">
            {selectedManager ? (
              <>
                <h2 className="text-[17px] font-semibold tracking-tight text-slate-900">
                  {selectedManager.name || selectedManager.username}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {roleLabel(selectedManager.role)}
                  {selectedManager.department ? ` · ${selectedManager.department}` : ''}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  {(selectedManager.permissions || []).length} of {allManagerPermissions.length} permissions granted
                </p>
                {selectedManager.role !== 'manager' && (
                  <p className="mt-3 text-sm text-slate-500">
                    Admin-console checks apply only while this account has the Manager role. Saving still stores the grant
                    list.
                  </p>
                )}
                <div className="mt-4">
                  <button type="button" onClick={() => setView('permissions')} className="ui-btn-primary ui-btn-sm">
                    Edit permissions
                  </button>
                </div>
                <h3 className="permissions-section-label">Permissions</h3>
                <PermissionMatrix value={new Set(selectedManager.permissions || [])} readOnly />
              </>
            ) : (
              <p className="text-sm text-slate-500">Select a user to review their access.</p>
            )}
          </section>
        </div>
      )}

      {view === 'permissions' && (
        <div className="admin-fill grid min-h-0 gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
          <UserRail
            loading={loading}
            search={search}
            onSearch={setSearch}
            rows={filteredManagers}
            selectedUid={selectedUid}
            onSelect={setSelectedUid}
          />
          <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
            {selectedManager ? (
              <>
                <div className="permissions-matrix-toolbar">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {selectedManager.name || selectedManager.username}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {roleLabel(selectedManager.role)}
                      {selectedManager.department ? ` · ${selectedManager.department}` : ''}
                      {` · ${grantedCount} of ${allManagerPermissions.length} granted`}
                      {dirty ? ' · unsaved' : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPermissionSet(new Set(allManagerPermissions))}
                      className="ui-btn-secondary ui-btn-sm"
                    >
                      Select All
                    </button>
                    <button type="button" onClick={() => setPermissionSet(new Set())} className="ui-btn-secondary ui-btn-sm">
                      Deselect All
                    </button>
                    <button
                      type="button"
                      onClick={() => setPermissionSet(new Set(defaultManagerPermissions))}
                      className="ui-btn-secondary ui-btn-sm"
                    >
                      Reset to Default
                    </button>
                    <button type="button" onClick={save} disabled={saving} className="ui-btn-primary ui-btn-sm">
                      {saving ? 'Saving…' : 'Save Permissions'}
                    </button>
                  </div>
                </div>
                {selectedManager.role !== 'manager' && (
                  <p className="border-b border-slate-100 px-5 py-3 text-sm text-slate-500">
                    These grants are stored for the account. They take effect in the admin console only if the account is a
                    manager.
                  </p>
                )}
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5">
                  <PermissionMatrix
                    value={permissionSet}
                    onToggle={togglePermission}
                    onToggleGroupKeys={toggleGroup}
                  />
                </div>
              </>
            ) : (
              <p className="p-5 text-sm text-slate-500">Select a user to edit permissions.</p>
            )}
          </section>
        </div>
      )}

      <details className="permissions-audit shrink-0 rounded-xl border border-slate-200 bg-white">
        <summary className="permissions-audit-summary">
          <span>Audit history</span>
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              loadData();
            }}
            className="ui-btn-secondary ui-btn-sm"
          >
            Refresh
          </button>
        </summary>
        <div className="border-t border-slate-100 px-4 py-3">
          <GlassTable
            className="rounded-none border-0 shadow-none"
            emptyIcon={History}
            emptyTitle="No audit entries yet"
            emptyMessage="Permission changes are recorded here with the actor and the affected user."
            columns={[
              { key: 'action', label: 'Action' },
              { key: 'actor', label: 'Actor' },
              { key: 'target', label: 'Target' },
              { key: 'time', label: 'Time', className: 'w-44' },
            ]}
          >
            {auditLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm text-slate-800">{log.action}</TableCell>
                <TableCell>
                  <TableIdentity size="sm" name={log.actor?.name || log.actor?.username || 'Unknown user'} />
                </TableCell>
                <TableCell>
                  <TableIdentity
                    size="sm"
                    name={log.target?.name || log.target?.username || 'Unknown user'}
                    tone="neutral"
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap text-xs text-slate-500">{formatWhen(log.timestamp)}</TableCell>
              </TableRow>
            ))}
          </GlassTable>
        </div>
      </details>
    </div>
  );
}

function UserRail({ loading, search, onSearch, rows, selectedUid, onSelect }) {
  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="shrink-0 border-b border-slate-200 p-3">
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search users"
          aria-label="Search users"
          className="ui-input w-full"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && (
          <div className="space-y-2 p-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="skeleton h-14 rounded-lg" />
            ))}
          </div>
        )}
        {!loading && rows.length === 0 && (
          <EmptyStateBody
            size="sm"
            icon={SearchX}
            title="No users match"
            description={
              search
                ? 'Try a shorter search term, or clear it to see every manager and admin.'
                : 'Promote someone to manager and they will show up here for permission tuning.'
            }
            action={
              search ? (
                <button type="button" onClick={() => onSearch('')} className="ui-btn-secondary ui-btn-sm">
                  Clear search
                </button>
              ) : null
            }
            className="py-8"
          />
        )}
        {rows.map((row) => {
          const active = row.uid === selectedUid;
          return (
            <button
              key={row.uid}
              type="button"
              onClick={() => onSelect(row.uid)}
              className={`permissions-rail-item w-full text-left ${active ? 'is-active' : ''}`}
            >
              <span className="block truncate text-sm font-medium text-slate-900">{row.name || row.username}</span>
              <span className="mt-0.5 block truncate text-xs text-slate-400">
                {roleLabel(row.role)}
                {row.department ? ` · ${row.department}` : ''}
                {` · ${(row.permissions || []).length} granted`}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function PermissionMatrix({ value, onToggle, onToggleGroupKeys, readOnly = false }) {
  return (
    <div className="permission-matrix">
      <div className="permission-matrix-head">
        <span>Permission</span>
        <span>Access</span>
      </div>
      {managerPermissionGroups.map((group, index) => {
        const keys = group.permissions.map(([key]) => key);
        const granted = keys.filter((key) => value.has(key)).length;
        return (
          <details key={group.group} className="permission-group" defaultOpen={index === 0}>
            <summary>
              <span className="permission-group-name">{group.group}</span>
              {!readOnly && onToggleGroupKeys && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    onToggleGroupKeys(keys, granted !== keys.length);
                  }}
                  className="permission-group-action"
                >
                  {granted === keys.length ? 'Clear group' : 'Grant group'}
                </button>
              )}
              <span className="permission-group-count">
                {granted}/{keys.length}
              </span>
            </summary>
            <ul>
              {group.permissions.map(([key, label]) => (
                <li key={key} className="permission-row">
                  <span>{label}</span>
                  <label className="permission-check">
                    <span className="sr-only">{label}</span>
                    <input
                      type="checkbox"
                      className="ui-checkbox"
                      checked={value.has(key)}
                      disabled={readOnly}
                      onChange={() => onToggle?.(key)}
                    />
                  </label>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}
