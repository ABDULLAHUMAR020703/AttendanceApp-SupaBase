import { useCallback, useEffect, useState } from 'react';
import { GlassCard } from '../../../shared/components/GlassCard';
import { PermissionGate } from '../../../shared/components/PermissionGate';
import { adminService } from '../services/adminService';
import { PERMISSIONS } from '../permissions';
import { useSilentPoll } from '../../../shared/hooks/useSilentPoll';

const WORK_MODE_LABELS = {
  in_office: 'In Office',
  semi_remote: 'Semi Remote',
  fully_remote: 'Fully Remote',
};

function ApprovalProgress({ progress }) {
  if (!progress?.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {progress.map((p) => (
        <span
          key={p.id}
          className={`text-xs rounded-full px-2 py-0.5 border ${
            p.action === 'approved' ? 'border-green-400/40 bg-green-500/20 text-green-100'
              : p.action === 'rejected' ? 'border-red-400/40 bg-red-500/20 text-red-100'
                : 'border-amber-400/30 bg-amber-500/15 text-amber-100'
          }`}
        >
          {p.step_label || `Step ${p.step_order}`}: {p.action}
        </span>
      ))}
    </div>
  );
}

export function WorkModeRequestsPage() {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Work Mode Requests</h1>
          <p className="text-sm text-slate-300 mt-1">Review remote and hybrid work change requests.</p>
        </div>
        <button type="button" onClick={load} className="text-xs text-blue-200 underline">Refresh</button>
      </div>

      {error && <GlassCard className="p-4 text-sm text-red-100">{error}</GlassCard>}

      {loading ? (
        <div className="h-32 skeleton rounded-xl" />
      ) : rows.length === 0 ? (
        <GlassCard className="p-6 text-center text-slate-400 text-sm">No work mode requests.</GlassCard>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <GlassCard key={r.id} className="p-4 space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="text-slate-100 font-medium">{r.employee?.name || r.employee_uid}</p>
                  <p className="text-sm text-slate-300">
                    {WORK_MODE_LABELS[r.current_work_mode] || r.current_work_mode}
                    {' → '}
                    <span className="text-white">{WORK_MODE_LABELS[r.requested_work_mode] || r.requested_work_mode}</span>
                  </p>
                  {r.reason && <p className="text-xs text-slate-400 mt-1">{r.reason}</p>}
                  <p className="text-xs text-slate-500 mt-1 capitalize">Status: {r.status} · Step {r.current_step || 1}</p>
                </div>
                {r.status === 'pending' && (
                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <input
                      placeholder="Admin notes (optional)"
                      value={notes[r.id] || ''}
                      onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                      className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs text-slate-100"
                    />
                    <div className="flex gap-2">
                      <PermissionGate permission={PERMISSIONS.APPROVE_WORK_MODE}>
                        <button type="button" onClick={() => process(r.id, 'approved')} className="flex-1 rounded bg-green-700/80 px-2 py-1 text-xs text-white">Approve</button>
                      </PermissionGate>
                      <PermissionGate permission={PERMISSIONS.REJECT_WORK_MODE}>
                        <button type="button" onClick={() => process(r.id, 'rejected')} className="flex-1 rounded bg-red-700/80 px-2 py-1 text-xs text-white">Reject</button>
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
