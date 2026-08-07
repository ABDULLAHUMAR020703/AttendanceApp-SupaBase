import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarOff } from 'lucide-react';
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
import { Alert, Button, EmptyState, PageHeader, StatusBadge } from '../../../shared/components/ui';
import { SkeletonCardList } from '../../../shared/components/ui/Skeleton';

export function LeavesPage() {
  const navigate = useNavigate();
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
        {loading && <SkeletonCardList count={5} />}
        {!loading && rows.length === 0 && (
          <EmptyState
            icon={CalendarOff}
            title="No leave requests"
            description="When employees submit leave requests, they land here for review with their approval chain attached."
            actionLabel="Configure approval steps"
            onAction={() => navigate('/approvals')}
          />
        )}
        {!loading &&
          rows.map((r) => (
            <GlassCard key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-body-tight font-medium text-ink">{formatEmployeeDisplay(r)}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <StatusBadge status={r.status} label={formatLeaveStatus(r.status)} />
                  <span className="text-caption text-ink-muted">
                    {formatLeaveTypeLabel(r.leave_type)}
                    {r.current_step > 1 ? ` · Step ${r.current_step}` : ''}
                    {r.employee_department ? ` · ${r.employee_department}` : ''}
                  </span>
                </div>
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
