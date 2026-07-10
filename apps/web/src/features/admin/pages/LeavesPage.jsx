import { useCallback, useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import { GlassCard } from '../../../shared/components/GlassCard';
import { PermissionGate, usePermission } from '../../../shared/components/PermissionGate';
import { PERMISSIONS } from '../permissions';
import {
  formatEmployeeDisplay,
  formatLeaveStatus,
  formatLeaveTypeLabel,
} from '../utils/leaveDisplay';
import { useSilentPoll } from '../../../shared/hooks/useSilentPoll';
import { Alert, Button, EmptyState, PageHeader } from '../../../shared/components/ui';

export function LeavesPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await adminService.getLeaves();
      setRows(data || []);
    } catch (err) {
      if (!silent) setError(err?.response?.data?.error || err?.message || 'Failed to load leaves');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);
  const canApprove = usePermission(PERMISSIONS.APPROVE_LEAVE);
  const canReject = usePermission(PERMISSIONS.REJECT_LEAVE);

  useEffect(() => {
    load();
  }, [load]);

  useSilentPoll(load, 30000);

  const processLeave = async (id, status) => {
    try {
      await adminService.processLeave(id, { status });
      load();
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to process leave');
    }
  };

  return (
    <div className="page-container">
      <PageHeader title="Leaves" subtitle="Review and process employee leave requests" onRefresh={load} refreshing={loading} />
      {error && <Alert type="error">{error}</Alert>}
      <div className="space-y-2">
        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 rounded-card border border-white/15 skeleton" />
          ))}
        {!loading && rows.length === 0 && (
          <EmptyState
            title="No leave requests"
            description="When employees submit leave requests, they will appear here for review."
            icon={<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>}
          />
        )}
        {!loading &&
          rows.map((r) => (
            <GlassCard key={r.id} className="p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <div className="min-w-0">
                <p className="text-slate-100 font-medium truncate">{formatEmployeeDisplay(r)}</p>
                <p className="text-sm text-slate-300 mt-0.5">
                  {formatLeaveTypeLabel(r.leave_type)} · {formatLeaveStatus(r.status)}
                  {r.current_step > 1 ? ` · Step ${r.current_step}` : ''}
                  {r.employee_department ? ` · ${r.employee_department}` : ''}
                </p>
              </div>
              {r.status === 'pending' && (canApprove || canReject) && (
                <div className="flex gap-2 shrink-0">
                  <PermissionGate permission={PERMISSIONS.APPROVE_LEAVE}>
                    <Button variant="success" size="sm" onClick={() => processLeave(r.id, 'approved')}>Approve</Button>
                  </PermissionGate>
                  <PermissionGate permission={PERMISSIONS.REJECT_LEAVE}>
                    <Button variant="danger" size="sm" onClick={() => processLeave(r.id, 'rejected')}>Reject</Button>
                  </PermissionGate>
                </div>
              )}
            </GlassCard>
          ))}
      </div>
    </div>
  );
}
