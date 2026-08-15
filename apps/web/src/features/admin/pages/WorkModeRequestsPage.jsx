import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Laptop } from 'lucide-react';
import { PermissionGate } from '../../../shared/components/PermissionGate';
import { adminService } from '../services/adminService';
import { PERMISSIONS } from '../permissions';
import { useSilentPoll } from '../../../shared/hooks/useSilentPoll';
import { Alert, EmptyState, PageHeader, formatStatusLabel } from '../../../shared/components/ui';
import { SkeletonCardList } from '../../../shared/components/ui/Skeleton';

const WORK_MODE_LABELS = {
  in_office: 'In Office',
  semi_remote: 'Semi Remote',
  fully_remote: 'Fully Remote',
};

const BOARD_COLUMNS = [
  {
    id: 'rejected',
    title: 'Rejected',
    subtitle: 'Requests that did not pass approval',
    shell: 'border-[#FECACA] bg-[#FEF2F2]/70',
    header: 'bg-[#FEF2F2] text-[#991B1B]',
    count: 'border-[#FECACA] bg-white text-[#991B1B]',
  },
  {
    id: 'pending',
    title: 'Pending / In Review',
    subtitle: 'Requests still moving through the pipeline',
    shell: 'border-[#FDE68A] bg-[#FFFBEB]/70',
    header: 'bg-[#FFFBEB] text-[#92400E]',
    count: 'border-[#FDE68A] bg-white text-[#92400E]',
  },
  {
    id: 'completed',
    title: 'Completed / Done',
    subtitle: 'Approved requests ready for the employee',
    shell: 'border-[#BBF7D0] bg-[#F0FDF4]/70',
    header: 'bg-[#F0FDF4] text-[#166534]',
    count: 'border-[#BBF7D0] bg-white text-[#166534]',
  },
];

const CARD_TONES = {
  rejected: {
    card: 'border-[#FECACA] bg-[#FEF2F2]',
    avatar: 'border-[#FECACA] bg-white text-[#991B1B]',
    accent: '#991B1B',
  },
  pending: {
    card: 'border-[#FDE68A] bg-[#FFFBEB]',
    avatar: 'border-[#FDE68A] bg-white text-[#92400E]',
    accent: '#92400E',
  },
  completed: {
    card: 'border-[#BBF7D0] bg-[#F0FDF4]',
    avatar: 'border-[#BBF7D0] bg-white text-[#166534]',
    accent: '#166534',
  },
};

const CHIP_TONES = {
  approved: 'border-[#BBF7D0] bg-[#DCFCE7] text-[#166534]',
  rejected: 'border-[#FECACA] bg-[#FEE2E2] text-[#991B1B]',
  pending: 'border-[#FDE68A] bg-[#FEF3C7] text-[#92400E]',
  in_review: 'border-[#FDE68A] bg-[#FEF3C7] text-[#92400E]',
  default: 'border-[#CBD5E1] bg-white text-[#475569]',
};

const normalizeStatus = (value) => String(value || 'pending').toLowerCase();

const initialsOf = (value = 'User') =>
  String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'U';

function requestColumnId(request) {
  const status = normalizeStatus(request.status);
  const progress = request.approvalProgress || [];
  if (status === 'rejected' || progress.some((step) => normalizeStatus(step.action) === 'rejected')) {
    return 'rejected';
  }
  if (status === 'approved' || status === 'completed' || status === 'done') return 'completed';
  return 'pending';
}

function StatusChip({ tone = 'default', children }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold leading-none ${CHIP_TONES[tone] || CHIP_TONES.default}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}

function ApprovalProgress({ progress }) {
  if (!progress?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {progress.map((p) => {
        const action = normalizeStatus(p.action);
        return (
          <StatusChip key={p.id || `${p.step_label}-${p.step_order}`} tone={action}>
            {p.step_label || `Step ${p.step_order}`}: {formatStatusLabel(action)}
          </StatusChip>
        );
      })}
    </div>
  );
}

function RequestCard({ request, notes, onNoteChange, onProcess }) {
  const columnId = requestColumnId(request);
  const tone = CARD_TONES[columnId] || CARD_TONES.pending;
  const employeeName = request.employee?.name || request.employee?.username || request.employee_uid || 'Employee';
  const currentMode = WORK_MODE_LABELS[request.current_work_mode] || request.current_work_mode || 'Current mode';
  const requestedMode = WORK_MODE_LABELS[request.requested_work_mode] || request.requested_work_mode || 'Requested mode';
  const progress = request.approvalProgress || [];
  const totalSteps = Math.max(progress.length, request.current_step || 1);
  const currentStep = Math.min(request.current_step || totalSteps, totalSteps);
  const status = normalizeStatus(request.status);

  return (
    <article className={`group rounded-2xl border p-4 shadow-[0_8px_22px_-18px_rgba(15,23,42,0.28)] transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:shadow-[0_16px_30px_-22px_rgba(15,23,42,0.34)] ${tone.card}`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-[12px] font-bold ${tone.avatar}`} aria-hidden>
          {initialsOf(employeeName)}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold leading-tight text-[#0F172A]">{employeeName}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] font-medium text-[#475569]">
            <span>{currentMode}</span>
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2.1} aria-hidden />
            <span className="font-semibold text-[#0F172A]">{requestedMode}</span>
          </div>
        </div>
      </div>

      {request.reason && (
        <p className="mt-3 line-clamp-3 text-[13px] italic leading-5 text-[#64748B]">{request.reason}</p>
      )}

      <div className="mt-4 space-y-2.5">
        <div className="flex flex-wrap gap-1.5">
          <StatusChip tone={status}>{formatStatusLabel(status)}</StatusChip>
          <StatusChip tone={columnId === 'completed' ? 'approved' : columnId === 'rejected' ? 'rejected' : 'pending'}>
            Step {currentStep} of {totalSteps}
          </StatusChip>
        </div>
        <ApprovalProgress progress={progress} />
      </div>

      {status === 'pending' && (
        <div className="mt-4 space-y-2 border-t border-black/5 pt-3">
          <input
            placeholder="Admin notes (optional)"
            value={notes[request.id] || ''}
            onChange={(e) => onNoteChange(request.id, e.target.value)}
            className="ui-input ui-input-sm bg-white/80"
          />
          <div className="grid grid-cols-2 gap-2">
            <PermissionGate permission={PERMISSIONS.APPROVE_WORK_MODE}>
              <button type="button" onClick={() => onProcess(request.id, 'approved')} className="ui-btn-success ui-btn-sm">Approve</button>
            </PermissionGate>
            <PermissionGate permission={PERMISSIONS.REJECT_WORK_MODE}>
              <button type="button" onClick={() => onProcess(request.id, 'rejected')} className="ui-btn-danger-soft ui-btn-sm">Reject</button>
            </PermissionGate>
          </div>
        </div>
      )}
    </article>
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

  const groupedRows = useMemo(() => {
    const groups = { rejected: [], pending: [], completed: [] };
    for (const row of rows) groups[requestColumnId(row)].push(row);
    return groups;
  }, [rows]);

  const updateNote = useCallback((id, value) => {
    setNotes((current) => ({ ...current, [id]: value }));
  }, []);

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
        <div className="overflow-x-auto pb-2">
          <div className="grid min-w-[960px] grid-cols-3 gap-4 xl:min-w-0 xl:grid-cols-[repeat(3,minmax(300px,1fr))]">
            {BOARD_COLUMNS.map((column) => {
              const items = groupedRows[column.id] || [];
              return (
                <section key={column.id} className={`flex max-h-[calc(100vh-13rem)] min-h-[30rem] flex-col overflow-hidden rounded-2xl border ${column.shell}`}>
                  <header className={`sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-black/5 px-4 py-3 ${column.header}`}>
                    <div className="min-w-0">
                      <h2 className="text-[14px] font-semibold leading-tight">{column.title}</h2>
                      <p className="mt-0.5 text-[11px] font-medium opacity-75">{column.subtitle}</p>
                    </div>
                    <span className={`grid h-7 min-w-7 place-items-center rounded-full border px-2 text-[12px] font-bold ${column.count}`}>
                      {items.length}
                    </span>
                  </header>

                  <div className="no-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                    {items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-black/10 bg-white/55 px-3 py-8 text-center text-[13px] font-medium text-[#64748B]">
                        No requests here
                      </div>
                    ) : (
                      items.map((request) => (
                        <RequestCard
                          key={request.id}
                          request={request}
                          notes={notes}
                          onNoteChange={updateNote}
                          onProcess={process}
                        />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
