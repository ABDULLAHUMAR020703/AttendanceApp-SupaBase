import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { adminService } from '../services/adminService';
import { useAuthStore } from '../../auth/store/authStore';
import { PermissionGate } from '../../../shared/components/PermissionGate';
import { SlideOverPanel } from '../../../shared/components/SlideOverPanel';
import {
  GlassTable,
  TableActions,
  TableCell,
  TableIdentity,
  TableRow,
} from '../../../shared/components/GlassTable';
import { Alert } from '../../../shared/components/ui/Alert';
import { canAccessFeature, hasAnyPermission, hasPermission, PERMISSIONS } from '../permissions';
import { normalizeAttendanceType } from '../utils/analyticsCharts';
import { formatEmployeeDisplay, formatLeaveStatus, formatLeaveTypeLabel } from '../utils/leaveDisplay';
import { PageActions } from '../../../shared/components/pageChrome';

const DETAIL_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'team', label: 'Team' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'leave', label: 'Leave' },
];

const formatRole = (value) =>
  String(value || 'employee')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const personKeys = (person) =>
  [person?.uid, person?.id, person?.username, person?.employee_uid, person?.employeeUid, person?.employee_username]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

const recordKey = (row) =>
  String(row?.user_uid || row?.uid || row?.username || row?.employee_uid || row?.employeeUid || '').toLowerCase();

const formatJoined = (isoValue) => {
  if (!isoValue) return '—';
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const isOnLeaveToday = (leave) => {
  if (String(leave.status || '').toLowerCase() !== 'approved') return false;
  const start = leave.start_date ? new Date(leave.start_date) : null;
  const end = leave.end_date ? new Date(leave.end_date) : null;
  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return today >= start && today <= end;
};

export function DepartmentsPage() {
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const createInputRef = useRef(null);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [leaveRows, setLeaveRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [activeDept, setActiveDept] = useState(null);
  const [detailTab, setDetailTab] = useState('overview');
  const [renameState, setRenameState] = useState({ id: null, value: '' });
  const [error, setError] = useState('');

  const canManageDepartments = hasPermission(user, PERMISSIONS.MANAGE_DEPARTMENTS);
  const canViewAttendance = hasAnyPermission(user, [PERMISSIONS.VIEW_ATTENDANCE, PERMISSIONS.MANUAL_ATTENDANCE]);
  const canViewLeaves = hasAnyPermission(user, [
    PERMISSIONS.VIEW_LEAVE_REQUESTS,
    PERMISSIONS.APPROVE_LEAVE,
    PERMISSIONS.REJECT_LEAVE,
  ]);
  const canViewUsers = canAccessFeature(user, 'users');

  const load = async () => {
    setError('');
    try {
      const [departmentRows, attendance, leaves] = await Promise.all([
        adminService.getDepartmentsOverview(),
        canViewAttendance ? adminService.getAttendance().catch(() => []) : Promise.resolve([]),
        canViewLeaves ? adminService.getLeaves().catch(() => []) : Promise.resolve([]),
      ]);
      setRows(departmentRows || []);
      setAttendanceRows(attendance || []);
      setLeaveRows(leaves || []);
      setActiveDept((current) => {
        if (!current) return current;
        return (departmentRows || []).find((row) => row.id === current.id) || current;
      });
    } catch (err) {
      console.error('[DepartmentsPage] Failed to load departments:', err);
      setError(err?.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [canViewAttendance, canViewLeaves]);

  useEffect(() => {
    if (location.state?.focusCreate && canManageDepartments) {
      setCreateOpen(true);
      navigate(location.pathname, { replace: true, state: {} });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  useEffect(() => {
    if (createOpen) {
      const frame = window.requestAnimationFrame(() => createInputRef.current?.focus());
      return () => window.cancelAnimationFrame(frame);
    }
    return undefined;
  }, [createOpen]);

  const presentTodayKeys = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const keys = new Set();
    for (const row of attendanceRows) {
      if (!row.timestamp || normalizeAttendanceType(row.type) !== 'checkin') continue;
      const stamp = new Date(row.timestamp);
      if (Number.isNaN(stamp.getTime()) || stamp < startOfToday) continue;
      const key = recordKey(row);
      if (key) keys.add(key);
    }
    return keys;
  }, [attendanceRows]);

  const isPresentToday = (person) => personKeys(person).some((key) => presentTodayKeys.has(key));

  const departmentStats = useMemo(() => {
    const map = new Map();
    for (const dept of rows) {
      const employees = dept.employees || [];
      const active = employees.filter((emp) => emp.is_active !== false);
      const present = canViewAttendance ? active.filter((emp) => isPresentToday(emp)).length : null;
      const memberKeys = new Set(employees.flatMap((emp) => personKeys(emp)));
      const deptLeaves = canViewLeaves
        ? leaveRows.filter((leave) => {
            const leaveKeys = personKeys(leave);
            return (
              leaveKeys.some((key) => memberKeys.has(key)) ||
              String(leave.employee_department || leave.department || '').toLowerCase() === String(dept.name || '').toLowerCase()
            );
          })
        : [];
      map.set(dept.id, {
        total: employees.length,
        active: dept.employeeCount ?? active.length,
        inactive: employees.filter((emp) => emp.is_active === false).length,
        present,
        pendingLeaves: deptLeaves.filter((leave) => String(leave.status || '').toLowerCase() === 'pending').length,
        onLeaveToday: deptLeaves.filter(isOnLeaveToday).length,
        leaves: deptLeaves
          .sort(
            (a, b) =>
              new Date(b.requested_at || b.created_at || 0).getTime() -
              new Date(a.requested_at || a.created_at || 0).getTime()
          )
          .slice(0, 8),
      });
    }
    return map;
  }, [rows, presentTodayKeys, leaveRows, canViewAttendance, canViewLeaves]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((d) => {
      const lead = d.manager?.name || d.manager?.username || '';
      return d.name.toLowerCase().includes(q) || lead.toLowerCase().includes(q);
    });
  }, [rows, search]);

  const openCreate = () => {
    setName('');
    setCreateOpen(true);
  };

  const openDepartment = (dept, tab = 'overview') => {
    setActiveDept(dept);
    setDetailTab(tab);
    setRenameState({ id: dept.id, value: dept.name });
  };

  const closeDepartment = () => {
    setActiveDept(null);
    setDetailTab('overview');
    setRenameState({ id: null, value: '' });
  };

  const onCreateDepartment = async (event) => {
    event?.preventDefault?.();
    if (!name.trim()) return;
    setError('');
    setCreateSubmitting(true);
    try {
      await adminService.createDepartment({ name });
      setName('');
      setCreateOpen(false);
      await load();
    } catch (err) {
      console.error('[DepartmentsPage] Failed to create department:', err);
      setError(err?.message || 'Failed to create department');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const onRenameDepartment = async (id) => {
    const newName = renameState.value.trim();
    if (!newName) return;
    setError('');
    try {
      await adminService.renameDepartment(id, { name: newName });
      setRenameState({ id: null, value: '' });
      await load();
    } catch (err) {
      console.error('[DepartmentsPage] Failed to rename department:', err);
      setError(err?.message || 'Failed to rename department');
    }
  };

  const onDeleteDepartment = async (id) => {
    setError('');
    try {
      await adminService.deleteDepartment(id);
      if (activeDept?.id === id) closeDepartment();
      await load();
    } catch (err) {
      console.error('[DepartmentsPage] Failed to delete department:', err);
      setError(err?.message || 'Failed to delete department');
    }
  };

  const activeStats = activeDept ? departmentStats.get(activeDept.id) : null;
  const directoryEmpty = !loading && rows.length === 0;
  const visibleTabs = DETAIL_TABS.filter((tab) => {
    if (tab.id === 'attendance') return canViewAttendance;
    if (tab.id === 'leave') return canViewLeaves;
    return true;
  });

  const openRow = (event, dept) => {
    if (event.target.closest('button, input, a, [data-row-action]')) return;
    openDepartment(dept);
  };

  return (
    <div className="departments-directory admin-page gap-4 animate-fade-up">
      {canManageDepartments && (
        <PageActions>
          <PermissionGate permission={PERMISSIONS.MANAGE_DEPARTMENTS}>
            <button
              type="button"
              onClick={openCreate}
              data-on-dark
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#00B0FF] px-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#0099E6]"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
              Add department
            </button>
          </PermissionGate>
        </PageActions>
      )}

      <div className="filter-action-bar">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            strokeWidth={2}
            aria-hidden
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search departments"
            aria-label="Search departments"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#00B0FF] focus:outline-none focus:ring-2 focus:ring-[#00B0FF]/20"
          />
        </div>
        <p className="text-xs tabular-nums text-slate-400">
          {filteredRows.length} {filteredRows.length === 1 ? 'department' : 'departments'}
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
        <GlassTable
          className="rounded-none border-0 shadow-none"
          loading={loading}
          skeletonRows={5}
          emptyIcon={Building2}
          emptyTitle={directoryEmpty ? 'No departments yet' : 'No matching departments'}
          emptyMessage={
            directoryEmpty
              ? 'Create the first department to group people into teams and assign reporting structure.'
              : 'Try a different search to find the team you need.'
          }
          emptyAction={
            directoryEmpty && canManageDepartments ? (
              <button
                type="button"
                onClick={openCreate}
                data-on-dark
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#00B0FF] px-3 text-sm font-semibold text-white transition-colors hover:bg-[#0099E6]"
              >
                Add department
              </button>
            ) : null
          }
          columns={[
            { key: 'name', label: 'Department' },
            { key: 'lead', label: 'Lead' },
            { key: 'people', label: 'Employees' },
            canViewAttendance && { key: 'attendance', label: 'Attendance' },
            { key: 'status', label: 'Status' },
            { key: 'actions', label: <span className="sr-only">Actions</span>, className: 'w-16' },
          ].filter(Boolean)}
        >
          {filteredRows.map((d) => {
            const stats = departmentStats.get(d.id);
            const leadName = d.manager?.name || d.manager?.username;
            return (
              <TableRow key={d.id} onClick={(event) => openRow(event, d)}>
                <TableCell>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      openDepartment(d);
                    }}
                    className="text-left"
                  >
                    <p className="text-sm font-semibold text-slate-900 transition-colors hover:text-[#00B0FF]">{d.name}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{stats?.total || 0} on roster</p>
                  </button>
                </TableCell>
                <TableCell className="text-sm text-slate-600">
                  {leadName || <span className="text-slate-400">Unassigned</span>}
                </TableCell>
                <TableCell className="text-sm tabular-nums text-slate-700">{d.employeeCount ?? stats?.active ?? 0}</TableCell>
                {canViewAttendance && (
                  <TableCell>
                    {stats?.present == null ? (
                      <span className="text-sm text-slate-400">—</span>
                    ) : (
                      <span className="text-sm tabular-nums text-slate-600">
                        <span className="font-medium text-slate-900">{stats.present}</span>
                        {' / '}
                        {stats.active} in today
                      </span>
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <QuietStatus active={(d.employeeCount ?? 0) > 0} offLabel="Empty" />
                </TableCell>
                <TableCell>
                  <span data-row-action>
                    <TableActions
                      label={`Actions for ${d.name}`}
                      items={[
                        { label: 'Open', onClick: () => openDepartment(d) },
                        canManageDepartments && {
                          label: 'Rename',
                          icon: Pencil,
                          onClick: () => openDepartment(d, 'overview'),
                        },
                        canManageDepartments && {
                          label: 'Delete',
                          icon: Trash2,
                          tone: 'danger',
                          onClick: () => onDeleteDepartment(d.id),
                        },
                      ]}
                    />
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </GlassTable>
      </div>

      <SlideOverPanel open={createOpen} onClose={() => (createSubmitting ? null : setCreateOpen(false))}>
        <form className="flex h-full flex-col" onSubmit={onCreateDepartment}>
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <p className="text-[17px] font-semibold tracking-tight text-slate-900">Add department</p>
              <p className="mt-1 text-sm text-slate-500">Give the team a name. People can be assigned from Users.</p>
            </div>
            <button
              type="button"
              onClick={() => !createSubmitting && setCreateOpen(false)}
              className="ui-btn-ghost ui-btn-sm"
              disabled={createSubmitting}
            >
              Close
            </button>
          </div>
          <div className="space-y-3 p-5">
            <label className="block space-y-1">
              <span className="ui-label">Department name</span>
              <input
                ref={createInputRef}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="ui-input"
                placeholder="Engineering"
              />
            </label>
          </div>
          <div className="mt-auto flex justify-end gap-2 border-t border-slate-200 p-5">
            <button type="button" onClick={() => setCreateOpen(false)} disabled={createSubmitting} className="ui-btn-secondary ui-btn-sm">
              Cancel
            </button>
            <button type="submit" disabled={createSubmitting || !name.trim()} className="ui-btn-primary ui-btn-sm">
              {createSubmitting ? 'Creating…' : 'Create department'}
            </button>
          </div>
        </form>
      </SlideOverPanel>

      <SlideOverPanel open={Boolean(activeDept)} onClose={closeDepartment}>
        {activeDept && (
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[17px] font-semibold tracking-tight text-slate-900">{activeDept.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {activeDept.manager?.name || activeDept.manager?.username || 'No lead assigned'}
                    <span className="text-slate-300"> · </span>
                    {activeDept.employeeCount} {activeDept.employeeCount === 1 ? 'employee' : 'employees'}
                  </p>
                </div>
                <button type="button" onClick={closeDepartment} className="ui-btn-ghost ui-btn-sm">
                  Close
                </button>
              </div>
              <nav className="mt-4 flex gap-1 overflow-x-auto" aria-label="Department sections">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDetailTab(tab.id)}
                    className={`shrink-0 rounded-md px-2.5 py-1.5 text-sm transition-colors duration-150 ${
                      detailTab === tab.id
                        ? 'bg-slate-100 font-semibold text-slate-900'
                        : 'font-medium text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              {detailTab === 'overview' && (
                <div className="space-y-5">
                  <dl>
                    <ProfileField label="Lead">{activeDept.manager?.name || activeDept.manager?.username || 'Unassigned'}</ProfileField>
                    <ProfileField label="Active employees">{activeStats?.active ?? activeDept.employeeCount}</ProfileField>
                    <ProfileField label="On roster">{activeStats?.total ?? (activeDept.employees || []).length}</ProfileField>
                    {canViewAttendance && (
                      <ProfileField label="In today">
                        {activeStats?.present == null ? '—' : `${activeStats.present} of ${activeStats.active}`}
                      </ProfileField>
                    )}
                    {canViewLeaves && <ProfileField label="On leave today">{activeStats?.onLeaveToday ?? 0}</ProfileField>}
                    {canViewLeaves && <ProfileField label="Pending leave">{activeStats?.pendingLeaves ?? 0}</ProfileField>}
                    <ProfileField label="Created">{formatJoined(activeDept.created_at)}</ProfileField>
                  </dl>

                  {canManageDepartments && (
                    <PermissionGate permission={PERMISSIONS.MANAGE_DEPARTMENTS}>
                      <div className="space-y-2 border-t border-slate-100 pt-4">
                        <p className="text-xs font-medium uppercase tracking-[0.06em] text-slate-400">Rename</p>
                        <div className="flex gap-2">
                          <input
                            className="ui-input"
                            value={renameState.id === activeDept.id ? renameState.value : activeDept.name}
                            onChange={(e) => setRenameState({ id: activeDept.id, value: e.target.value })}
                            aria-label="Rename department"
                          />
                          <button type="button" className="ui-btn-secondary ui-btn-sm shrink-0" onClick={() => onRenameDepartment(activeDept.id)}>
                            Save
                          </button>
                        </div>
                      </div>
                    </PermissionGate>
                  )}
                </div>
              )}

              {detailTab === 'team' && (
                <div>
                  {(activeDept.employees || []).length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No employees in this department.
                      {canViewUsers ? ' Assign people from Users.' : ''}
                    </p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {(activeDept.employees || []).map((emp) => (
                        <li key={emp.uid} className="flex items-center justify-between gap-3 py-2.5">
                          <TableIdentity
                            size="sm"
                            name={emp.name || emp.username}
                            secondary={[formatRole(emp.role), emp.position].filter(Boolean).join(' · ')}
                          />
                          <QuietStatus active={emp.is_active !== false} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {detailTab === 'attendance' && canViewAttendance && (
                <div>
                  <p className="mb-3 text-sm text-slate-500">
                    {activeStats?.present ?? 0} of {activeStats?.active ?? 0} active people are in today.
                  </p>
                  {(activeDept.employees || []).filter((emp) => emp.is_active !== false).length === 0 ? (
                    <p className="text-sm text-slate-500">No active employees to track.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {(activeDept.employees || [])
                        .filter((emp) => emp.is_active !== false)
                        .map((emp) => (
                          <li key={emp.uid} className="flex items-center justify-between gap-3 py-2.5">
                            <span className="truncate text-sm text-slate-700">{emp.name || emp.username}</span>
                            <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${isPresentToday(emp) ? 'bg-[#00B0FF]' : 'bg-slate-300'}`}
                                aria-hidden
                              />
                              {isPresentToday(emp) ? 'In today' : 'Not in'}
                            </span>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              )}

              {detailTab === 'leave' && canViewLeaves && (
                <div>
                  {(activeStats?.leaves || []).length === 0 ? (
                    <p className="text-sm text-slate-500">No leave activity for this department.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {activeStats.leaves.map((leave) => (
                        <li key={leave.id} className="flex items-baseline justify-between gap-3 py-2.5">
                          <span className="min-w-0">
                            <span className="block truncate text-sm text-slate-800">
                              {formatEmployeeDisplay(leave)}
                            </span>
                            <span className="text-xs text-slate-400">{formatLeaveTypeLabel(leave.leave_type)}</span>
                          </span>
                          <span className="shrink-0 text-xs text-slate-500">{formatLeaveStatus(leave.status)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {canManageDepartments && (
              <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-200 px-5 py-4">
                <PermissionGate permission={PERMISSIONS.MANAGE_DEPARTMENTS}>
                  <button type="button" onClick={() => onDeleteDepartment(activeDept.id)} className="ui-btn-danger ui-btn-sm">
                    Delete department
                  </button>
                </PermissionGate>
              </div>
            )}
          </div>
        )}
      </SlideOverPanel>
    </div>
  );
}

function QuietStatus({ active, onLabel = 'Active', offLabel = 'Inactive' }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-300'}`} aria-hidden />
      {active ? onLabel : offLabel}
    </span>
  );
}

function ProfileField({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <dt className="shrink-0 text-xs font-medium text-slate-400">{label}</dt>
      <dd className="min-w-0 text-right text-sm text-slate-800">{children ?? '—'}</dd>
    </div>
  );
}
