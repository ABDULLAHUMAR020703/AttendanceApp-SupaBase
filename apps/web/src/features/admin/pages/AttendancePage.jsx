import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminService } from '../services/adminService';
import { GlassCard } from '../../../shared/components/GlassCard';
import { PermissionGate, useAnyPermission } from '../../../shared/components/PermissionGate';
import { PERMISSIONS } from '../permissions';
import { useSilentPoll } from '../../../shared/hooks/useSilentPoll';

function toLocalInputValue(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function downloadAttendanceCsv(rows) {
  const header = ['username', 'employee_name', 'type', 'timestamp', 'auth_method', 'is_manual', 'latitude', 'longitude', 'address'];
  const lines = [header.join(',')];
  for (const row of rows || []) {
    const loc = row.location || {};
    const values = [
      row.username,
      row.employee_name || row.employeeName || '',
      row.type,
      row.timestamp,
      row.auth_method || row.authMethod || '',
      row.is_manual ? 'yes' : 'no',
      loc.latitude ?? '',
      loc.longitude ?? '',
      loc.address ?? '',
    ].map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`);
    lines.push(values.join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `attendance-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function AlertBanner({ type = 'info', message, onDismiss }) {
  if (!message) return null;
  const styles = {
    success: 'border-green-300/25 bg-green-500/15 text-green-100',
    error: 'border-red-300/25 bg-red-500/15 text-red-100',
    info: 'border-blue-300/25 bg-blue-500/15 text-blue-100',
  };
  return (
    <GlassCard className={`p-4 text-sm flex items-start justify-between gap-3 ${styles[type] || styles.info}`} role="status">
      <span>{message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="text-xs underline opacity-80 hover:opacity-100">
          Dismiss
        </button>
      )}
    </GlassCard>
  );
}

export function AttendancePage() {
  const [rows, setRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    username: '',
    type: 'checkin',
    timestamp: toLocalInputValue(new Date().toISOString()),
    locationNote: '',
  });

  const canViewAttendance = useAnyPermission([PERMISSIONS.VIEW_ATTENDANCE, PERMISSIONS.MANUAL_ATTENDANCE]);

  const loadAttendance = useCallback(async (silent = false) => {
    if (!canViewAttendance) return;
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await adminService.getAttendance();
      setRows(data || []);
    } catch (err) {
      if (!silent) setError(err?.response?.data?.error || err?.message || 'Failed to load attendance');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [canViewAttendance]);

  const loadUsers = useCallback(async () => {
    try {
      const data = await adminService.getUsers();
      setUsers(data || []);
    } catch {
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    loadAttendance();
    loadUsers();
  }, [canViewAttendance, loadAttendance, loadUsers]);

  useSilentPoll(loadAttendance, 30000, [canViewAttendance]);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)),
    [rows]
  );

  const handleExport = async () => {
    setActionLoading(true);
    setNotice(null);
    try {
      const data = rows.length ? rows : await adminService.getAttendance();
      if (!data?.length) {
        setNotice({ type: 'info', message: 'No attendance records available to export.' });
        return;
      }
      downloadAttendanceCsv(data);
      setNotice({ type: 'success', message: `Exported ${data.length} attendance record(s) to CSV.` });
    } catch (err) {
      setNotice({ type: 'error', message: err?.message || 'Export failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualForm.username) {
      setNotice({ type: 'error', message: 'Select an employee for the manual correction.' });
      return;
    }
    setActionLoading(true);
    setNotice(null);
    try {
      const payload = {
        username: manualForm.username,
        type: manualForm.type,
        timestamp: manualForm.timestamp ? new Date(manualForm.timestamp).toISOString() : new Date().toISOString(),
        location: manualForm.locationNote
          ? { address: manualForm.locationNote, latitude: null, longitude: null }
          : null,
      };
      await adminService.createManualAttendance(payload);
      setNotice({ type: 'success', message: 'Manual attendance record saved successfully.' });
      setShowManual(false);
      setManualForm({
        username: '',
        type: 'checkin',
        timestamp: toLocalInputValue(new Date().toISOString()),
        locationNote: '',
      });
      await loadAttendance();
    } catch (err) {
      setNotice({ type: 'error', message: err?.message || 'Failed to save manual correction.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (record) => {
    if (!window.confirm(`Delete ${record.type} record for ${record.username}?`)) return;
    setActionLoading(true);
    setNotice(null);
    try {
      await adminService.deleteAttendance(record.id);
      setNotice({ type: 'success', message: 'Attendance record deleted.' });
      await loadAttendance();
    } catch (err) {
      setNotice({ type: 'error', message: err?.message || 'Failed to delete record.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Attendance</h1>
          <p className="mt-1 text-sm text-slate-300">Review records, apply manual corrections, and export attendance data.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PermissionGate permission={PERMISSIONS.MANUAL_ATTENDANCE}>
            <button
              type="button"
              onClick={() => setShowManual(true)}
              disabled={actionLoading}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-xs text-white hover:bg-indigo-700 transition-all duration-200 disabled:opacity-50"
            >
              Manual Correction
            </button>
          </PermissionGate>
          <PermissionGate permission={PERMISSIONS.EXPORT_ATTENDANCE}>
            <button
              type="button"
              onClick={handleExport}
              disabled={actionLoading || loading}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs text-slate-100 hover:bg-white/20 transition-all duration-200 disabled:opacity-50"
            >
              {actionLoading ? 'Exporting…' : 'Export Attendance'}
            </button>
          </PermissionGate>
          {canViewAttendance && (
            <button
              type="button"
              onClick={loadAttendance}
              disabled={loading}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs text-slate-100 hover:bg-white/20 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
        </div>
      </div>

      <AlertBanner {...(notice || {})} onDismiss={() => setNotice(null)} />

      <PermissionGate anyOf={[PERMISSIONS.VIEW_ATTENDANCE, PERMISSIONS.MANUAL_ATTENDANCE]}>
        {error && <GlassCard className="p-4 text-sm text-red-100" role="alert">{error}</GlassCard>}

        {showManual && (
          <GlassCard className="p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-white">Manual Correction</h2>
                <p className="mt-1 text-xs text-slate-400">Add a check-in or check-out on behalf of an employee.</p>
              </div>
              <button type="button" onClick={() => setShowManual(false)} className="text-xs text-slate-300 hover:text-white">
                Close
              </button>
            </div>
            <form onSubmit={handleManualSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="manual-user" className="text-xs text-slate-300">Employee</label>
                <select
                  id="manual-user"
                  value={manualForm.username}
                  onChange={(e) => setManualForm((f) => ({ ...f, username: e.target.value }))}
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100"
                  required
                >
                  <option value="" className="bg-slate-800">Select employee</option>
                  {users.map((u) => (
                    <option key={u.uid || u.username} value={u.username} className="bg-slate-800">
                      {u.name || u.username} ({u.username})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="manual-type" className="text-xs text-slate-300">Type</label>
                <select
                  id="manual-type"
                  value={manualForm.type}
                  onChange={(e) => setManualForm((f) => ({ ...f, type: e.target.value }))}
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="checkin" className="bg-slate-800">Check-in</option>
                  <option value="checkout" className="bg-slate-800">Check-out</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="manual-time" className="text-xs text-slate-300">Date & time</label>
                <input
                  id="manual-time"
                  type="datetime-local"
                  value={manualForm.timestamp}
                  onChange={(e) => setManualForm((f) => ({ ...f, timestamp: e.target.value }))}
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100"
                  required
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="manual-location" className="text-xs text-slate-300">Location note (optional)</label>
                <input
                  id="manual-location"
                  type="text"
                  value={manualForm.locationNote}
                  onChange={(e) => setManualForm((f) => ({ ...f, locationNote: e.target.value }))}
                  placeholder="e.g. Office HQ — corrected by manager"
                  className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Saving…' : 'Save correction'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowManual(false)}
                  className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-slate-100 hover:bg-white/20"
                >
                  Cancel
                </button>
              </div>
            </form>
          </GlassCard>
        )}

        <div className="space-y-2">
          {loading &&
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl border border-white/15 bg-white/10 skeleton" />
            ))}
          {!loading && sortedRows.length === 0 && (
            <GlassCard className="p-4 text-sm text-slate-300">No attendance records found.</GlassCard>
          )}
          {!loading &&
            sortedRows.slice(0, 100).map((r) => (
              <GlassCard key={r.id} className="p-3 text-slate-100">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {r.employee_name || r.username || 'Unknown user'}
                      <span className="ml-2 text-xs uppercase text-slate-400">{r.type || 'event'}</span>
                      {r.is_manual && <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-100">Manual</span>}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {r.timestamp ? new Date(r.timestamp).toLocaleString() : 'Unknown time'}
                      {r.location?.address ? ` · ${r.location.address}` : ''}
                    </p>
                  </div>
                  <PermissionGate permission={PERMISSIONS.MANUAL_ATTENDANCE}>
                    <button
                      type="button"
                      onClick={() => handleDelete(r)}
                      disabled={actionLoading}
                      className="self-start text-xs text-red-300 hover:text-red-200 underline disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </PermissionGate>
                </div>
              </GlassCard>
            ))}
        </div>
      </PermissionGate>
    </div>
  );
}
