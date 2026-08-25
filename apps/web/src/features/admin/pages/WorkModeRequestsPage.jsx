import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Laptop2 } from 'lucide-react';
import { adminService } from '../services/adminService';
import { useAuthStore } from '../../auth/store/authStore';
import { SlideOverPanel } from '../../../shared/components/SlideOverPanel';
import {
  GlassTable,
  TableActions,
  TableCell,
  TableIdentity,
  TableRow,
} from '../../../shared/components/GlassTable';
import { Alert } from '../../../shared/components/ui/Alert';
import { EmptyStateBody } from '../../../shared/components/ui/EmptyState';
import { formatStatusLabel } from '../../../shared/components/ui';
import { canAccessFeature, hasPermission, PERMISSIONS } from '../permissions';
import { useSilentPoll } from '../../../shared/hooks/useSilentPoll';

const MODE_CATALOG = [
  {
    id: 'in_office',
    name: 'Office',
    description: 'Teams work from an approved site and must be inside the geofence to check in.',
    attendance: 'Check-in and check-out at an assigned work site.',
    location: 'Required',
    locationDetail: 'GPS is captured at check-in so presence can be verified against assigned sites.',
    geofence: 'Required',
    geofenceDetail: 'Check-in is valid only inside an assigned site radius. Presence is monitored while checked in.',
    aliases: ['in_office', 'office'],
  },
  {
    id: 'semi_remote',
    name: 'Hybrid',
    description: 'Teams split time between assigned sites and approved remote locations.',
    attendance: 'Check-in is required; site presence is not enforced.',
    location: 'Required',
    locationDetail: 'Location is captured on the attendance record, including remote check-ins.',
    geofence: 'Not required',
    geofenceDetail: 'Employees may check in from home or other approved remote locations without a site radius.',
    aliases: ['semi_remote', 'hybrid'],
  },
  {
    id: 'fully_remote',
    name: 'Remote',
    description: 'Teams work away from company sites without a required check-in location.',
    attendance: 'Check-in is recorded from any location.',
    location: 'Optional',
    locationDetail: 'Coordinates may be attached to the check-in but are not required.',
    geofence: 'Not required',
    geofenceDetail: 'Remote check-ins are not validated against a geofence.',
    aliases: ['fully_remote', 'remote'],
  },
];

const REQUEST_FILTERS = [
  { id: 'pending', label: 'Pending' },
  { id: 'all', label: 'All' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

const MODE_LABELS = Object.fromEntries(MODE_CATALOG.flatMap((mode) => mode.aliases.map((alias) => [alias, mode.name])));

function canonicalWorkMode(value) {
  const mode = String(value || 'in_office')
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_');
  const match = MODE_CATALOG.find((item) => item.aliases.includes(mode));
  return match?.id || null;
}

function formatWorkMode(value) {
  const mode = String(value || '').toLowerCase().replace(/-/g, '_');
  return MODE_LABELS[mode] || String(value || 'Unknown').replace(/_/g, ' ');
}

function normalizeStatus(value) {
  return String(value || 'pending').toLowerCase();
}

function requestColumnId(request) {
  const status = normalizeStatus(request.status);
  const progress = request.approvalProgress || [];
  if (status === 'rejected' || progress.some((step) => normalizeStatus(step.action) === 'rejected')) {
    return 'rejected';
  }
  if (status === 'approved' || status === 'completed' || status === 'done') return 'approved';
  return 'pending';
}

function formatWhen(iso) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function employeeName(request) {
  return request.employee?.name || request.employee?.username || request.employee_uid || 'Employee';
}

function employeeSecondary(request) {
  return request.employee?.email || request.employee?.username || request.employee?.department || '';
}

export function WorkModeRequestsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [activeMode, setActiveMode] = useState(null);
  const [activeRequest, setActiveRequest] = useState(null);
  const [requestFilter, setRequestFilter] = useState('pending');

  const canApprove = hasPermission(user, PERMISSIONS.APPROVE_WORK_MODE);
  const canReject = hasPermission(user, PERMISSIONS.REJECT_WORK_MODE);
  const canViewUsers = canAccessFeature(user, 'users');
  const canManageSites = canAccessFeature(user, 'sites');

  const loadRequests = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await adminService.getWorkModeRequests();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      setRows([]);
      setError(err?.message || 'Failed to load work mode requests');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const loadDirectory = useCallback(async () => {
    setDirectoryLoading(true);
    try {
      const [userRows, siteRows] = await Promise.all([
        canViewUsers ? adminService.getUsers().catch(() => []) : Promise.resolve([]),
        canManageSites ? adminService.getSites().catch(() => []) : Promise.resolve([]),
      ]);
      setUsers(userRows || []);
      setSites(siteRows || []);
    } catch {
      setUsers([]);
      setSites([]);
    } finally {
      setDirectoryLoading(false);
    }
  }, [canViewUsers, canManageSites]);

  useEffect(() => {
    loadRequests();
    loadDirectory();
  }, [loadRequests, loadDirectory]);

  useSilentPoll(loadRequests, 30000);

  const modes = useMemo(() => {
    const activeUsers = users.filter((row) => row.is_active !== false);
    return MODE_CATALOG.map((mode) => {
      const people = activeUsers.filter((row) => canonicalWorkMode(row.work_mode) === mode.id);
      const departments = Array.from(
        new Set(people.map((row) => row.department).filter((value) => value && value !== '—'))
      ).sort();
      return {
        ...mode,
        people,
        departments,
        employeeCount: people.length,
      };
    });
  }, [users]);

  const filteredRequests = useMemo(() => {
    if (requestFilter === 'all') return rows;
    return rows.filter((row) => requestColumnId(row) === requestFilter);
  }, [rows, requestFilter]);

  const pendingCount = useMemo(
    () => rows.filter((row) => requestColumnId(row) === 'pending').length,
    [rows]
  );

  useEffect(() => {
    if (!activeRequest?.id) return;
    setActiveRequest((current) => {
      if (!current) return current;
      return rows.find((row) => row.id === current.id) || null;
    });
  }, [rows]);

  async function process(id, status) {
    setBusyId(id);
    setError('');
    try {
      await adminService.processWorkModeRequest(id, { status, admin_notes: notes[id] || '' });
      await loadRequests();
      if (normalizeStatus(status) !== 'pending') {
        setActiveRequest((current) => (current?.id === id ? null : current));
      }
    } catch (err) {
      setError(err.message || 'Failed to process request');
    } finally {
      setBusyId(null);
    }
  }

  const openMode = (event, mode) => {
    if (event.target.closest('button, input, a, [data-row-action]')) return;
    setActiveRequest(null);
    setActiveMode(mode);
  };

  const openRequest = (event, request) => {
    if (event.target.closest('button, input, a, [data-row-action]')) return;
    setActiveMode(null);
    setActiveRequest(request);
  };

  const selectedMode = activeMode ? modes.find((mode) => mode.id === activeMode.id) || activeMode : null;

  return (
    <div className="work-modes-directory admin-page gap-4 animate-fade-up">
      {error && <Alert type="error">{error}</Alert>}

      <section className="shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <GlassTable
          className="rounded-none border-0 shadow-none"
          loading={directoryLoading}
          skeletonRows={3}
          emptyTitle="No work modes"
          emptyMessage="Supported work modes will appear here."
          columns={[
            { key: 'mode', label: 'Mode' },
            { key: 'people', label: 'Employees' },
            { key: 'location', label: 'Location' },
            { key: 'attendance', label: 'Attendance' },
            { key: 'geofence', label: 'Geofence' },
            { key: 'status', label: 'Status' },
          ]}
        >
          {modes.map((mode) => (
            <TableRow key={mode.id} onClick={(event) => openMode(event, mode)}>
              <TableCell>
                <p className="text-sm font-medium text-slate-900">{mode.name}</p>
                <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">{mode.description}</p>
              </TableCell>
              <TableCell className="text-sm tabular-nums text-slate-700">
                {canViewUsers ? mode.employeeCount : '—'}
              </TableCell>
              <TableCell className="text-sm text-slate-600">{mode.location}</TableCell>
              <TableCell className="max-w-[16rem] truncate text-sm text-slate-500">{mode.attendance}</TableCell>
              <TableCell className="text-sm text-slate-600">{mode.geofence}</TableCell>
              <TableCell>
                <QuietStatus active label="Active" />
              </TableCell>
            </TableRow>
          ))}
        </GlassTable>
      </section>

      <section>
        <div className="mb-3 flex shrink-0 flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Change requests</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {pendingCount} pending
            </p>
          </div>
          <div className="ui-segment" role="tablist" aria-label="Request status">
            {REQUEST_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={requestFilter === item.id}
                onClick={() => setRequestFilter(item.id)}
                className={`ui-segment-item ${requestFilter === item.id ? 'ui-segment-item-active' : ''}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
          {loading ? (
            <GlassTable
              className="rounded-none border-0 shadow-none"
              loading
              skeletonRows={4}
              columns={[
                { key: 'employee', label: 'Employee' },
                { key: 'change', label: 'Change' },
                { key: 'status', label: 'Status' },
                { key: 'when', label: 'Requested' },
                { key: 'actions', label: <span className="sr-only">Actions</span>, className: 'w-16' },
              ]}
            />
          ) : rows.length === 0 ? (
            <EmptyStateBody
              icon={Laptop2}
              title="No work mode requests"
              description="When someone asks to switch between office, hybrid and remote, the request lands here for approval."
              action={
                <button
                  type="button"
                  onClick={() => navigate('/approval-workflows')}
                  className="ui-btn-primary ui-btn-sm"
                >
                  Review approval steps
                </button>
              }
              className="px-4 py-12"
            />
          ) : (
            <GlassTable
              className="rounded-none border-0 shadow-none"
              emptyTitle="No matching requests"
              emptyMessage="Try a different status filter."
              columns={[
                { key: 'employee', label: 'Employee' },
                { key: 'change', label: 'Change' },
                { key: 'status', label: 'Status' },
                { key: 'when', label: 'Requested' },
                { key: 'actions', label: <span className="sr-only">Actions</span>, className: 'w-16' },
              ]}
            >
              {filteredRequests.map((request) => {
                const columnId = requestColumnId(request);
                const pending = columnId === 'pending';
                return (
                  <TableRow key={request.id} onClick={(event) => openRequest(event, request)}>
                    <TableCell>
                      <TableIdentity
                        size="sm"
                        name={employeeName(request)}
                        secondary={employeeSecondary(request)}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {formatWorkMode(request.current_work_mode)}
                      <span className="px-1.5 text-slate-300">→</span>
                      <span className="text-slate-800">{formatWorkMode(request.requested_work_mode)}</span>
                    </TableCell>
                    <TableCell>
                      <QuietStatus
                        active={columnId === 'approved'}
                        warn={columnId === 'pending'}
                        label={formatStatusLabel(normalizeStatus(request.status))}
                      />
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-slate-500">
                      {formatWhen(request.created_at || request.createdAt)}
                    </TableCell>
                    <TableCell>
                      <span data-row-action>
                        <TableActions
                          label={`Actions for ${employeeName(request)}`}
                          items={[
                            { label: 'View details', onClick: () => setActiveRequest(request) },
                            pending && canApprove
                              ? { label: 'Approve', onClick: () => process(request.id, 'approved') }
                              : null,
                            pending && canReject
                              ? { label: 'Reject', tone: 'danger', onClick: () => process(request.id, 'rejected') }
                              : null,
                          ]}
                        />
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </GlassTable>
          )}
        </div>
      </section>

      <SlideOverPanel open={Boolean(selectedMode)} onClose={() => setActiveMode(null)}>
        {selectedMode && (
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[17px] font-semibold tracking-tight text-slate-900">{selectedMode.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{selectedMode.description}</p>
                </div>
                <button type="button" onClick={() => setActiveMode(null)} className="ui-btn-ghost ui-btn-sm">
                  Close
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              <dl>
                <DetailField label="Work mode">{selectedMode.name}</DetailField>
                <DetailField label="Status"><QuietStatus active label="Active" /></DetailField>
                <DetailField label="Employees">
                  {canViewUsers ? `${selectedMode.employeeCount} assigned` : '—'}
                </DetailField>
                <DetailField label="Attendance">{selectedMode.attendance}</DetailField>
                <DetailField label="Location">{selectedMode.location}</DetailField>
                <DetailField label="Geofence">{selectedMode.geofence}</DetailField>
              </dl>

              <details className="work-mode-advanced mt-5">
                <summary>Location and geofence</summary>
                <div className="mt-3 space-y-3 text-sm text-slate-600">
                  <p>{selectedMode.locationDetail}</p>
                  <p>{selectedMode.geofenceDetail}</p>
                  {selectedMode.id === 'in_office' && canManageSites && (
                    <p>
                      {sites.length} {sites.length === 1 ? 'site' : 'sites'} configured.{' '}
                      <button type="button" onClick={() => navigate('/sites')} className="font-medium text-[#00B0FF] hover:underline">
                        Open geofencing
                      </button>
                    </p>
                  )}
                </div>
              </details>

              <details className="work-mode-advanced mt-2">
                <summary>People and departments</summary>
                <div className="mt-3">
                  {!canViewUsers ? (
                    <p className="text-sm text-slate-500">You don’t have access to the employee directory.</p>
                  ) : selectedMode.people.length === 0 ? (
                    <p className="text-sm text-slate-500">No one is assigned to this work mode.</p>
                  ) : (
                    <>
                      {selectedMode.departments.length > 0 && (
                        <p className="mb-3 text-xs text-slate-400">
                          {selectedMode.departments.join(' · ')}
                        </p>
                      )}
                      <ul className="divide-y divide-slate-100">
                        {selectedMode.people.map((person) => (
                          <li key={person.uid || person.username} className="flex items-center justify-between gap-3 py-2.5">
                            <span className="min-w-0">
                              <span className="block truncate text-sm text-slate-800">{person.name || person.username}</span>
                              <span className="block truncate text-xs text-slate-400">{person.department || person.email || person.username}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </details>
            </div>
          </div>
        )}
      </SlideOverPanel>

      <SlideOverPanel open={Boolean(activeRequest)} onClose={() => setActiveRequest(null)}>
        {activeRequest && (
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[17px] font-semibold tracking-tight text-slate-900">{employeeName(activeRequest)}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatWorkMode(activeRequest.current_work_mode)}
                    <span className="px-1.5 text-slate-300">→</span>
                    {formatWorkMode(activeRequest.requested_work_mode)}
                  </p>
                </div>
                <button type="button" onClick={() => setActiveRequest(null)} className="ui-btn-ghost ui-btn-sm">
                  Close
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              <dl>
                <DetailField label="Status">
                  <QuietStatus
                    active={requestColumnId(activeRequest) === 'approved'}
                    warn={requestColumnId(activeRequest) === 'pending'}
                    label={formatStatusLabel(normalizeStatus(activeRequest.status))}
                  />
                </DetailField>
                <DetailField label="Requested">{formatWhen(activeRequest.created_at || activeRequest.createdAt)}</DetailField>
                <DetailField label="Reason">{activeRequest.reason || '—'}</DetailField>
              </dl>

              {(activeRequest.approvalProgress || []).length > 0 && (
                <div className="mt-5">
                  <p className="text-xs font-medium uppercase tracking-[0.06em] text-slate-400">Approval steps</p>
                  <ul className="mt-2 divide-y divide-slate-100">
                    {(activeRequest.approvalProgress || []).map((step) => (
                      <li key={step.id || `${step.step_label}-${step.step_order}`} className="flex items-center justify-between gap-3 py-2.5">
                        <span className="text-sm text-slate-700">{step.step_label || `Step ${step.step_order}`}</span>
                        <QuietStatus
                          active={normalizeStatus(step.action) === 'approved'}
                          warn={normalizeStatus(step.action) === 'pending' || normalizeStatus(step.action) === 'in_review'}
                          label={formatStatusLabel(normalizeStatus(step.action))}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {requestColumnId(activeRequest) === 'pending' && (
                <div className="mt-5 space-y-3">
                  <label className="block space-y-1">
                    <span className="text-xs font-medium uppercase tracking-[0.06em] text-slate-400">Admin notes</span>
                    <input
                      placeholder="Optional note for this decision"
                      value={notes[activeRequest.id] || ''}
                      onChange={(e) => setNotes((current) => ({ ...current, [activeRequest.id]: e.target.value }))}
                      className="ui-input"
                    />
                  </label>
                </div>
              )}
            </div>
            {requestColumnId(activeRequest) === 'pending' && (canApprove || canReject) && (
              <div className="mt-auto flex justify-end gap-2 border-t border-slate-200 p-5">
                {canReject && (
                  <button
                    type="button"
                    disabled={busyId === activeRequest.id}
                    onClick={() => process(activeRequest.id, 'rejected')}
                    className="ui-btn-danger ui-btn-sm"
                  >
                    Reject
                  </button>
                )}
                {canApprove && (
                  <button
                    type="button"
                    disabled={busyId === activeRequest.id}
                    onClick={() => process(activeRequest.id, 'approved')}
                    className="ui-btn-success ui-btn-sm"
                  >
                    {busyId === activeRequest.id ? 'Saving…' : 'Approve'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </SlideOverPanel>
    </div>
  );
}

function QuietStatus({ active = false, warn = false, label }) {
  const dot = active ? 'bg-emerald-500' : warn ? 'bg-amber-500' : 'bg-slate-300';
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
      {label}
    </span>
  );
}

function DetailField({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <dt className="shrink-0 text-xs font-medium text-slate-400">{label}</dt>
      <dd className="min-w-0 text-right text-sm text-slate-800">{children || '—'}</dd>
    </div>
  );
}
