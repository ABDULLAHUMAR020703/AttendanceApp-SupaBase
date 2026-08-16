import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarCheck, CalendarDays, Check, ChevronLeft, ChevronRight, Palmtree } from 'lucide-react';
import { adminService } from '../services/adminService';
import { useAuthStore } from '../../auth/store/authStore';
import { SlideOverPanel } from '../../../shared/components/SlideOverPanel';
import {
  GlassTable,
  TableActions,
  TableCell,
  TableIdentity,
  TablePagination,
  TableRow,
} from '../../../shared/components/GlassTable';
import { Alert } from '../../../shared/components/ui/Alert';
import { EmptyStateBody } from '../../../shared/components/ui/EmptyState';
import { Dialog } from '../../../shared/components/ui/Dialog';
import { KpiMetricCard, KpiMetricGrid } from '../../../shared/components/ui/KpiMetricCard';
import { canAccessFeature, hasPermission, PERMISSIONS } from '../permissions';
import {
  formatEmployeeDisplay,
  formatLeaveStatus,
  formatLeaveTypeLabel,
} from '../utils/leaveDisplay';
import { useSilentPoll } from '../../../shared/hooks/useSilentPoll';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const BALANCE_KEYS = {
  annual: 'annual_leaves',
  sick: 'sick_leaves',
  casual: 'casual_leaves',
};

const pad = (value) => String(value).padStart(2, '0');
const toDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

function parseDate(value) {
  if (!value) return null;
  const raw = String(value).split('T')[0];
  const [year, month, day] = raw.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function normalizeStatus(value) {
  return String(value || 'pending').toLowerCase();
}

function leaveDayCount(leave) {
  if (leave?.is_half_day) return 0.5;
  if (leave?.days) return Number(leave.days);
  const start = parseDate(leave?.start_date);
  const end = parseDate(leave?.end_date);
  if (!start || !end) return null;
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
}

function formatDuration(leave) {
  if (leave?.is_half_day) return leave.half_day_period ? `Half day (${leave.half_day_period})` : 'Half day';
  const days = leaveDayCount(leave);
  if (!days) return '—';
  return days === 1 ? '1 day' : `${days} days`;
}

function formatDateRange(leave) {
  const start = parseDate(leave.start_date);
  const end = parseDate(leave.end_date);
  if (!start) return '—';
  const from = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (!end || start.getTime() === end.getTime()) return from;
  const sameMonth = start.getMonth() === end.getMonth();
  const to = end.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : 'short',
    day: 'numeric',
  });
  return `${from} – ${to}`;
}

function coversDate(leave, date) {
  const start = parseDate(leave.start_date);
  const end = parseDate(leave.end_date);
  if (!start || !end) return false;
  const day = startOfDay(date);
  return startOfDay(start) <= day && startOfDay(end) >= day;
}

function isUpcoming(leave, today) {
  if (normalizeStatus(leave.status) !== 'approved') return false;
  const end = parseDate(leave.end_date);
  return Boolean(end && startOfDay(end) >= today);
}

function isOnLeaveToday(leave, today) {
  return normalizeStatus(leave.status) === 'approved' && coversDate(leave, today);
}

function buildMonthCells(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      key: toDateKey(date),
      inMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

function balanceForType(balance, leaveType) {
  if (!balance) return null;
  const key = BALANCE_KEYS[String(leaveType || '').toLowerCase()];
  if (!key || balance[key] == null) return null;
  return Number(balance[key]);
}

export function LeavesPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activeLeave, setActiveLeave] = useState(null);
  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [monthDate, setMonthDate] = useState(() => startOfDay(new Date()));
  const [selectedDay, setSelectedDay] = useState(null);

  const canApprove = hasPermission(user, PERMISSIONS.APPROVE_LEAVE);
  const canReject = hasPermission(user, PERMISSIONS.REJECT_LEAVE);
  const canViewUsers = canAccessFeature(user, 'users');
  const today = useMemo(() => startOfDay(new Date()), []);
  const todayKey = toDateKey(today);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError('');
    try {
      const data = await adminService.getLeaves();
      setRows(data || []);
    } catch (err) {
      if (!silent) setError(err?.response?.data?.error || err?.message || 'Failed to load leaves');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useSilentPoll(load, 30000);

  const summary = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let upcoming = 0;
    let onLeave = 0;
    for (const row of rows) {
      const status = normalizeStatus(row.status);
      if (status === 'pending') pending += 1;
      if (status === 'approved') approved += 1;
      if (isUpcoming(row, today)) upcoming += 1;
      if (isOnLeaveToday(row, today)) onLeave += 1;
    }
    return { pending, approved, upcoming, on_leave: onLeave };
  }, [rows, today]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        const status = normalizeStatus(row.status);
        const byStatus =
          statusFilter === 'all' ||
          (statusFilter === 'pending' && status === 'pending') ||
          (statusFilter === 'approved' && status === 'approved') ||
          (statusFilter === 'rejected' && status === 'rejected') ||
          (statusFilter === 'upcoming' && isUpcoming(row, today)) ||
          (statusFilter === 'on_leave' && isOnLeaveToday(row, today));
        const byDay = !selectedDay || coversDate(row, selectedDay);
        const haystack = `${formatEmployeeDisplay(row)} ${formatLeaveTypeLabel(row.leave_type)} ${row.reason || ''}`.toLowerCase();
        const byQuery = !term || haystack.includes(term);
        return byStatus && byDay && byQuery;
      })
      .sort((a, b) => {
        const pendingRank = (normalizeStatus(a.status) === 'pending' ? 0 : 1) - (normalizeStatus(b.status) === 'pending' ? 0 : 1);
        if (pendingRank) return pendingRank;
        return (parseDate(a.start_date)?.getTime() || 0) - (parseDate(b.start_date)?.getTime() || 0);
      });
  }, [rows, statusFilter, selectedDay, query, today]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, selectedDay, query]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const monthCells = useMemo(() => buildMonthCells(monthDate), [monthDate]);

  const leavesByDay = useMemo(() => {
    const map = new Map();
    for (const row of rows) {
      const start = parseDate(row.start_date);
      const end = parseDate(row.end_date);
      if (!start || !end) continue;
      const cursor = new Date(start);
      while (cursor <= end) {
        const key = toDateKey(cursor);
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(row);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }, [rows]);

  const awayToday = selectedDay
    ? (leavesByDay.get(toDateKey(selectedDay)) || []).filter(
        (row) => normalizeStatus(row.status) === 'approved' || normalizeStatus(row.status) === 'pending'
      )
    : rows.filter((row) => isOnLeaveToday(row, today));

  useEffect(() => {
    if (!activeLeave?.id) return;
    setActiveLeave((current) => {
      if (!current) return current;
      return rows.find((row) => row.id === current.id) || null;
    });
  }, [rows]);

  useEffect(() => {
    if (!activeLeave || !canViewUsers) {
      setBalance(null);
      return undefined;
    }
    const uid = activeLeave.employee_uid || activeLeave.employeeUid;
    if (!uid) {
      setBalance(null);
      return undefined;
    }
    let cancelled = false;
    setBalanceLoading(true);
    adminService
      .getUserProfile(uid)
      .then((profile) => {
        if (!cancelled) setBalance(profile?.leave_balance || null);
      })
      .catch(() => {
        if (!cancelled) setBalance(null);
      })
      .finally(() => {
        if (!cancelled) setBalanceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeLeave?.id, activeLeave?.employee_uid, activeLeave?.employeeUid, canViewUsers]);

  const processLeave = async (id, status, adminNotes = '') => {
    setBusyId(id);
    setError('');
    try {
      const payload = { status };
      if (adminNotes) payload.admin_notes = adminNotes;
      await adminService.processLeave(id, payload);
      setNotice(status === 'approved' ? 'Leave approved.' : 'Leave rejected.');
      setRejectTarget(null);
      setRejectNote('');
      setActiveLeave((current) => (current?.id === id ? null : current));
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to process leave');
    } finally {
      setBusyId(null);
    }
  };

  const openRow = (event, leave) => {
    if (event.target.closest('button, input, a, [data-row-action]')) return;
    setActiveLeave(leave);
  };

  const toggleFilter = (next) => {
    setSelectedDay(null);
    setStatusFilter((current) => (current === next ? 'all' : next));
  };

  const pickDay = (date) => {
    const key = toDateKey(date);
    setSelectedDay((current) => (current && toDateKey(current) === key ? null : new Date(date)));
    setStatusFilter('all');
  };

  const directoryEmpty = !loading && rows.length === 0;
  const remainingForType = activeLeave ? balanceForType(balance, activeLeave.leave_type) : null;

  return (
    <div className="leaves-directory admin-page gap-4 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Leaves</h1>
        <p className="mt-1 text-sm text-slate-500">Manage time off, balances and leave requests.</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {notice && (
        <Alert type="success" onDismiss={() => setNotice('')}>
          {notice}
        </Alert>
      )}

      <KpiMetricGrid columns={4}>
        <KpiMetricCard
          label="Pending"
          subtitle="Needs approval"
          value={loading ? '—' : summary.pending}
          icon={CalendarCheck}
          tone="warning"
          actionable={summary.pending > 0}
          active={statusFilter === 'pending'}
          onClick={() => toggleFilter('pending')}
        />
        <KpiMetricCard
          label="Approved"
          subtitle="Confirmed leave"
          value={loading ? '—' : summary.approved}
          icon={Check}
          tone="success"
          active={statusFilter === 'approved'}
          onClick={() => toggleFilter('approved')}
        />
        <KpiMetricCard
          label="Upcoming"
          subtitle="Future requests"
          value={loading ? '—' : summary.upcoming}
          icon={CalendarDays}
          active={statusFilter === 'upcoming'}
          onClick={() => toggleFilter('upcoming')}
        />
        <KpiMetricCard
          label="On leave"
          subtitle="Away today"
          value={loading ? '—' : summary.on_leave}
          icon={Palmtree}
          active={statusFilter === 'on_leave'}
          onClick={() => toggleFilter('on_leave')}
        />
      </KpiMetricGrid>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18.5rem]">
        <section className="min-w-0">
          <div className="mb-3 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search employee, type or reason"
              aria-label="Search leave requests"
              className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#00B0FF] focus:outline-none focus:ring-2 focus:ring-[#00B0FF]/20 sm:max-w-xs"
            />
            <div className="ui-segment" role="tablist" aria-label="Leave status">
              {[
                { id: 'all', label: 'All' },
                { id: 'pending', label: 'Pending' },
                { id: 'approved', label: 'Approved' },
                { id: 'rejected', label: 'Rejected' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={statusFilter === item.id}
                  onClick={() => {
                    setSelectedDay(null);
                    setStatusFilter(item.id);
                  }}
                  className={`ui-segment-item ${statusFilter === item.id ? 'ui-segment-item-active' : ''}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <p className="text-xs tabular-nums text-slate-400">
              {filtered.length} {filtered.length === 1 ? 'request' : 'requests'}
            </p>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
            {directoryEmpty ? (
              <EmptyStateBody
                icon={Palmtree}
                title="No leave requests"
                description="When employees submit leave requests, they land here for review with their approval chain attached."
                action={
                  <button
                    type="button"
                    onClick={() => navigate('/approval-workflows')}
                    className="ui-btn-primary ui-btn-sm"
                  >
                    Configure approval steps
                  </button>
                }
                className="py-12"
              />
            ) : (
              <>
                <GlassTable
                  className="rounded-none border-0 shadow-none"
                  loading={loading}
                  skeletonRows={6}
                  emptyTitle="No matching requests"
                  emptyMessage="Try a different status, date or search."
                  columns={[
                    { key: 'employee', label: 'Employee' },
                    { key: 'type', label: 'Leave type' },
                    { key: 'dates', label: 'Dates' },
                    { key: 'duration', label: 'Duration' },
                    { key: 'reason', label: 'Reason' },
                    { key: 'status', label: 'Status' },
                    { key: 'actions', label: <span className="sr-only">Actions</span>, className: 'w-16' },
                  ]}
                >
                  {paged.map((leave) => {
                    const pending = normalizeStatus(leave.status) === 'pending';
                    return (
                      <TableRow
                        key={leave.id}
                        onClick={(event) => openRow(event, leave)}
                        className={pending ? 'leave-row-pending' : ''}
                      >
                        <TableCell>
                          <TableIdentity
                            size="sm"
                            name={formatEmployeeDisplay(leave)}
                            secondary={leave.employee_department || leave.employee_username || ''}
                          />
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">{formatLeaveTypeLabel(leave.leave_type)}</TableCell>
                        <TableCell className="text-sm tabular-nums text-slate-700">{formatDateRange(leave)}</TableCell>
                        <TableCell className="text-sm tabular-nums text-slate-600">{formatDuration(leave)}</TableCell>
                        <TableCell className="max-w-[12rem] truncate text-sm text-slate-500">{leave.reason || '—'}</TableCell>
                        <TableCell>
                          <QuietStatus status={normalizeStatus(leave.status)} />
                        </TableCell>
                        <TableCell>
                          <span data-row-action>
                            <TableActions
                              label={`Actions for ${formatEmployeeDisplay(leave)}`}
                              items={[
                                { label: 'View details', onClick: () => setActiveLeave(leave) },
                                pending && canApprove
                                  ? { label: 'Approve', onClick: () => processLeave(leave.id, 'approved') }
                                  : null,
                                pending && canReject
                                  ? {
                                      label: 'Reject',
                                      tone: 'danger',
                                      onClick: () => {
                                        setRejectTarget(leave);
                                        setRejectNote('');
                                      },
                                    }
                                  : null,
                              ]}
                            />
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </GlassTable>
                {!loading && filtered.length > 0 && (
                  <TablePagination
                    className="border-t border-slate-100 px-4 py-3"
                    page={page}
                    pageSize={pageSize}
                    total={filtered.length}
                    pageSizes={[10, 25, 50]}
                    onPageChange={setPage}
                    onPageSizeChange={(size) => {
                      setPageSize(size);
                      setPage(1);
                    }}
                  />
                )}
              </>
            )}
          </div>
        </section>

        <aside className="rounded-xl border border-slate-200/80 bg-white p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">
              {monthDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                className="ui-btn-ghost ui-btn-sm px-2"
                aria-label="Previous month"
                onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="ui-btn-ghost ui-btn-sm px-2"
                aria-label="Next month"
                onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-px text-center">
            {WEEKDAYS.map((label, index) => (
              <span key={`${label}-${index}`} className="pb-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
                {label}
              </span>
            ))}
            {monthCells.map((cell) => {
              const dayLeaves = leavesByDay.get(cell.key) || [];
              const hasApproved = dayLeaves.some((row) => normalizeStatus(row.status) === 'approved');
              const hasPending = dayLeaves.some((row) => normalizeStatus(row.status) === 'pending');
              const selected = selectedDay && toDateKey(selectedDay) === cell.key;
              const isToday = cell.key === todayKey;
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => pickDay(cell.date)}
                  className={`relative flex h-8 items-center justify-center rounded-md text-xs ${
                    selected ? 'bg-[#F0FAFF] font-semibold text-[#0284C7]' : isToday ? 'font-semibold text-slate-900' : 'text-slate-600'
                  } ${cell.inMonth ? '' : 'text-slate-300'}`}
                >
                  {cell.date.getDate()}
                  {(hasApproved || hasPending) && (
                    <span
                      className={`absolute bottom-0.5 h-1 w-1 rounded-full ${hasPending && !hasApproved ? 'bg-amber-400' : 'bg-[#00B0FF]'}`}
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.06em] text-slate-400">
            {selectedDay
              ? selectedDay.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
              : 'Away today'}
          </p>
          {awayToday.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No one is on leave for this day.</p>
          ) : (
            <ul className="mt-1 divide-y divide-slate-100">
              {awayToday.map((leave) => (
                <li key={leave.id}>
                  <button
                    type="button"
                    onClick={() => setActiveLeave(leave)}
                    className="flex w-full items-baseline justify-between gap-2 py-2 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-slate-800">{formatEmployeeDisplay(leave)}</span>
                      <span className="text-xs text-slate-400">{formatLeaveTypeLabel(leave.leave_type)}</span>
                    </span>
                    <QuietStatus status={normalizeStatus(leave.status)} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>

      <SlideOverPanel open={Boolean(activeLeave)} onClose={() => setActiveLeave(null)}>
        {activeLeave && (
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[17px] font-semibold tracking-tight text-slate-900">{formatEmployeeDisplay(activeLeave)}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatLeaveTypeLabel(activeLeave.leave_type)}
                    <span className="text-slate-300"> · </span>
                    {formatDateRange(activeLeave)}
                  </p>
                </div>
                <button type="button" onClick={() => setActiveLeave(null)} className="ui-btn-ghost ui-btn-sm">
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <dl>
                <DetailField label="Employee">{formatEmployeeDisplay(activeLeave)}</DetailField>
                <DetailField label="Leave type">{formatLeaveTypeLabel(activeLeave.leave_type)}</DetailField>
                <DetailField label="Dates">{formatDateRange(activeLeave)}</DetailField>
                <DetailField label="Duration">{formatDuration(activeLeave)}</DetailField>
                <DetailField label="Reason">{activeLeave.reason || '—'}</DetailField>
                <DetailField label="Status">
                  <QuietStatus status={normalizeStatus(activeLeave.status)} />
                </DetailField>
                <DetailField label="Available balance">
                  {balanceLoading
                    ? 'Loading…'
                    : remainingForType != null
                      ? `${remainingForType} ${formatLeaveTypeLabel(activeLeave.leave_type).toLowerCase()} days`
                      : balance
                        ? `${balance.annual_leaves ?? '—'} annual · ${balance.sick_leaves ?? '—'} sick · ${balance.casual_leaves ?? '—'} casual`
                        : '—'}
                </DetailField>
              </dl>

              {(activeLeave.current_step || activeLeave.processed_by || activeLeave.admin_notes) && (
                <div className="mt-5">
                  <p className="text-xs font-medium uppercase tracking-[0.06em] text-slate-400">Approval history</p>
                  <dl className="mt-1">
                    {activeLeave.current_step ? <DetailField label="Step">{activeLeave.current_step}</DetailField> : null}
                    {activeLeave.processed_by ? <DetailField label="Processed by">{activeLeave.processed_by}</DetailField> : null}
                    {activeLeave.processed_at ? (
                      <DetailField label="Processed">
                        {new Date(activeLeave.processed_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </DetailField>
                    ) : null}
                    {activeLeave.admin_notes ? <DetailField label="Notes">{activeLeave.admin_notes}</DetailField> : null}
                  </dl>
                </div>
              )}
            </div>
            {normalizeStatus(activeLeave.status) === 'pending' && (canApprove || canReject) && (
              <div className="mt-auto flex justify-end gap-2 border-t border-slate-200 p-5">
                {canReject && (
                  <button
                    type="button"
                    className="ui-btn-danger ui-btn-sm"
                    disabled={busyId === activeLeave.id}
                    onClick={() => {
                      setRejectTarget(activeLeave);
                      setRejectNote('');
                    }}
                  >
                    Reject
                  </button>
                )}
                {canApprove && (
                  <button
                    type="button"
                    className="ui-btn-success ui-btn-sm"
                    disabled={busyId === activeLeave.id}
                    onClick={() => processLeave(activeLeave.id, 'approved')}
                  >
                    {busyId === activeLeave.id ? 'Saving…' : 'Approve'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </SlideOverPanel>

      <Dialog
        open={Boolean(rejectTarget)}
        onClose={() => (busyId ? null : setRejectTarget(null))}
        title="Reject leave request?"
        description={rejectTarget ? `${formatEmployeeDisplay(rejectTarget)} · ${formatLeaveTypeLabel(rejectTarget.leave_type)} · ${formatDateRange(rejectTarget)}` : ''}
        footer={
          <>
            <button type="button" className="ui-btn-secondary ui-btn-sm" disabled={Boolean(busyId)} onClick={() => setRejectTarget(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="ui-btn-danger ui-btn-sm"
              disabled={Boolean(busyId)}
              onClick={() => processLeave(rejectTarget.id, 'rejected', rejectNote.trim())}
            >
              {busyId ? 'Rejecting…' : 'Reject request'}
            </button>
          </>
        }
      >
        <label className="block space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.06em] text-slate-400">Note (optional)</span>
          <input
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Visible to the employee as admin notes"
            className="ui-input"
          />
        </label>
      </Dialog>
    </div>
  );
}

function QuietStatus({ status }) {
  const meta = {
    pending: { label: 'Pending', dot: 'bg-amber-500' },
    approved: { label: 'Approved', dot: 'bg-emerald-500' },
    rejected: { label: 'Rejected', dot: 'bg-slate-300' },
  }[status] || { label: formatLeaveStatus(status), dot: 'bg-slate-300' };
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden />
      {meta.label}
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
