import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Laptop } from 'lucide-react';
import { GlassCard } from '../../../shared/components/GlassCard';
import { PermissionGate } from '../../../shared/components/PermissionGate';
import { adminService } from '../services/adminService';
import { PERMISSIONS } from '../permissions';
import { useSilentPoll } from '../../../shared/hooks/useSilentPoll';
import { Alert, Badge, EmptyState, PageHeader, StatusBadge, formatStatusLabel } from '../../../shared/components/ui';
import { SkeletonCardList } from '../../../shared/components/ui/Skeleton';

const WORK_MODE_LABELS = {
  in_office: 'In Office',
  semi_remote: 'Semi Remote',
  fully_remote: 'Fully Remote',
};

function ApprovalProgress({ progress }) {
  if (!progress?.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {progress.map((p) => (
        <Badge key={p.id} status={p.action} dot>
          {p.step_label || `Step ${p.step_order}`}: {formatStatusLabel(p.action)}
        </Badge>
      ))}
    </div>
  );
}

export function WorkModeRequestsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notes, setNotes] = useState({});

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const data = await adminService.getWorkModeRequests();
      setRows(data || []);
    } catch (err) {
      if (!silent) setError(err.message || 'Failed to load requests');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useSilentPoll(load, 30000);

  async function process(id, status) {
    try {
      await adminService.processWorkModeRequest(id, { status, admin_notes: notes[id] || '' });
      await load();
    } catch (err) {
      setError(err.message || 'Failed to process request');
    }
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <PageHeader
        title="Work mode requests"
        subtitle="Review remote and hybrid work change requests."
        onRefresh={() => load()}
      />

      {error && <Alert variant="error">{error}</Alert>}

      {loading ? (
        <SkeletonCardList count={3} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Laptop}
          title="No work mode requests"
          description="When someone asks to switch between office, hybrid and remote, the request lands here for approval."
          actionLabel="Review approval steps"
          onAction={() => navigate('/approvals')}
        />
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <GlassCard key={r.id} className="p-4 space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-body-tight font-semibold text-ink">{r.employee?.name || r.employee_uid}</p>
                  <p className="mt-0.5 text-label text-ink-muted">
                    {WORK_MODE_LABELS[r.current_work_mode] || r.current_work_mode}
                    {' → '}
                    <span className="font-semibold text-ink">
                      {WORK_MODE_LABELS[r.requested_work_mode] || r.requested_work_mode}
                    </span>
                  </p>
                  {r.reason && <p className="mt-1 text-caption text-ink-muted">{r.reason}</p>}
                  <div className="mt-2 flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    <span className="text-caption text-ink-muted">Step {r.current_step || 1}</span>
                  </div>
                </div>
                {r.status === 'pending' && (
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <input
                      placeholder="Admin notes (optional)"
                      value={notes[r.id] || ''}
                      onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                      className="ui-input ui-input-sm"
                    />
                    <div className="flex gap-2">
                      <PermissionGate permission={PERMISSIONS.APPROVE_WORK_MODE}>
                        <button type="button" onClick={() => process(r.id, 'approved')} className="ui-btn-success ui-btn-sm flex-1">Approve</button>
                      </PermissionGate>
                      <PermissionGate permission={PERMISSIONS.REJECT_WORK_MODE}>
                        <button type="button" onClick={() => process(r.id, 'rejected')} className="ui-btn-danger-soft ui-btn-sm flex-1">Reject</button>
                      </PermissionGate>
                    </div>
                  </div>
                )}
              </div>
              <ApprovalProgress progress={r.approvalProgress} />
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
