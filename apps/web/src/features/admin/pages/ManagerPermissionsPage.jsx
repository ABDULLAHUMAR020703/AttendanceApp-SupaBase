import { useEffect, useMemo, useState } from 'react';
import { adminService } from '../services/adminService';
import {
  allManagerPermissions,
  defaultManagerPermissions,
  managerPermissionGroups,
} from '../permissions';
import { History, SearchX } from 'lucide-react';
import { GlassCard } from '../../../shared/components/GlassCard';
import { GlassTable, TableCell, TableIdentity, TableRow } from '../../../shared/components/GlassTable';
import { EmptyStateBody } from '../../../shared/components/ui/EmptyState';
import { SkeletonFeed } from '../../../shared/components/ui/Skeleton';

export function ManagerPermissionsPage() {
  const [managers, setManagers] = useState([]);
  const [selectedUid, setSelectedUid] = useState('');
  const [permissionSet, setPermissionSet] = useState(new Set());
  const [search, setSearch] = useState('');
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedManager = managers.find((m) => m.uid === selectedUid) || null;

  const filteredManagers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return managers;
    return managers.filter((manager) =>
      `${manager.name || ''} ${manager.username || ''} ${manager.email || ''} ${manager.department || ''}`
        .toLowerCase()
        .includes(q)
    );
  }, [managers, search]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [managerRows, logs] = await Promise.all([
        adminService.getManagers(),
        adminService.getAuditLogs(),
      ]);
      setManagers(managerRows || []);
      setAuditLogs(logs || []);
      const first = (managerRows || [])[0];
      if (first) {
        setSelectedUid(first.uid);
        setPermissionSet(new Set(first.permissions || []));
      }
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
    const manager = managers.find((m) => m.uid === selectedUid);
    if (manager) setPermissionSet(new Set(manager.permissions || []));
  }, [selectedUid, managers]);

  const togglePermission = (key) => {
    setPermissionSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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
        prev.map((manager) =>
          manager.uid === selectedManager.uid ? { ...manager, permissions } : manager
        )
      );
      setMessage('Permissions saved.');
      const logs = await adminService.getAuditLogs();
      setAuditLogs(logs || []);
    } catch (err) {
      setError(err?.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const grantedCount = permissionSet.size;

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="page-title">User Permissions</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Control portal access from one source of truth.
        </p>
      </div>

      {error && <GlassCard className="p-4 text-sm text-danger-ink">{error}</GlassCard>}
      {message && <GlassCard className="p-4 text-sm text-accent-600">{message}</GlassCard>}

      <div className="grid grid-cols-1 xl:grid-cols-[22rem_1fr] gap-5">
        <GlassCard className="p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="ui-input w-full"
          />
          <div className="mt-4 space-y-2">
            {loading && <SkeletonFeed count={5} />}
            {!loading && filteredManagers.length === 0 && (
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
                    <button type="button" onClick={() => setSearch('')} className="ui-btn-secondary ui-btn-sm">
                      Clear search
                    </button>
                  ) : null
                }
                className="py-8"
              />
            )}
            {filteredManagers.map((manager) => {
              const active = manager.uid === selectedUid;
              return (
                <button
                  key={manager.uid}
                  type="button"
                  onClick={() => setSelectedUid(manager.uid)}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition-colors duration-fast ease-premium ${
                    active
                      ? 'border-accent-600/40 bg-accent-50 text-accent-600'
                      : 'border-hairline bg-white text-ink hover:border-hairline-strong hover:bg-surface-subtle'
                  }`}
                >
                  <span className="block text-sm font-semibold">{manager.name || manager.username}</span>
                  <span className={`block text-xs ${active ? 'text-accent-600' : 'text-ink-muted'}`}>
                    {manager.department || 'No department'} / {(manager.permissions || []).length} permissions
                  </span>
                </button>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          {selectedManager ? (
            <>
              <div className="flex flex-col gap-3 border-b border-hairline pb-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-lg font-semibold text-ink">
                    {selectedManager.name || selectedManager.username}
                  </p>
                  <p className="text-sm text-ink-muted">
                    {grantedCount} of {allManagerPermissions.length} permissions granted
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setPermissionSet(new Set(allManagerPermissions))} className="ui-btn-secondary ui-btn-sm">
                    Select All
                  </button>
                  <button type="button" onClick={() => setPermissionSet(new Set())} className="ui-btn-secondary ui-btn-sm">
                    Deselect All
                  </button>
                  <button type="button" onClick={() => setPermissionSet(new Set(defaultManagerPermissions))} className="ui-btn-secondary ui-btn-sm">
                    Reset to Default
                  </button>
                  <button type="button" onClick={save} disabled={saving} className="ui-btn-primary ui-btn-sm">
                    {saving ? 'Saving…' : 'Save Permissions'}
                  </button>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {managerPermissionGroups.map((group) => (
                  <div key={group.group} className="rounded-xl border border-hairline bg-[#F8FCFD] p-4">
                    <p className="font-semibold text-ink">{group.group}</p>
                    <div className="mt-3 space-y-2">
                      {group.permissions.map(([key, label]) => (
                        <label key={key} className="flex items-center gap-3 text-sm text-ink">
                          <input
                            type="checkbox"
                            checked={permissionSet.has(key)}
                            onChange={() => togglePermission(key)}
                            className="h-4 w-4"
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-ink-muted">Select a user to edit permissions.</p>
          )}
        </GlassCard>
      </div>

      <GlassCard className="p-5">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-ink">Audit History</p>
          <button type="button" onClick={loadData} className="ui-btn-secondary ui-btn-sm">
            Refresh
          </button>
        </div>
        <div className="mt-4">
          <GlassTable
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
                <TableCell className="font-medium">{log.action}</TableCell>
                <TableCell>
                  <TableIdentity name={log.actor?.name || log.actor?.username || 'Unknown user'} />
                </TableCell>
                <TableCell>
                  <TableIdentity
                    name={log.target?.name || log.target?.username || 'Unknown user'}
                    tone="neutral"
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap text-caption text-ink-muted">
                  {new Date(log.timestamp).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </GlassTable>
        </div>
      </GlassCard>
    </div>
  );
}
