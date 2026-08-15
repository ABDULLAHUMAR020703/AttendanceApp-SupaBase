import { useCallback, useEffect, useState } from 'react';
import { ListChecks } from 'lucide-react';
import { GlassCard } from '../../../shared/components/GlassCard';
import { adminService } from '../services/adminService';
import { EmptyStateBody } from '../../../shared/components/ui/EmptyState';
import { SkeletonCardList } from '../../../shared/components/ui/Skeleton';

const REQUEST_TYPE_LABELS = {
  annual_leave: 'Annual Leave',
  sick_leave: 'Sick Leave',
  casual_leave: 'Casual Leave',
  remote_work: 'Remote Work',
};

const APPROVER_ROLE_LABELS = {
  department_manager: 'Team Lead / Department Manager',
  hr: 'HR',
  super_admin: 'Super Admin',
};

export function ApprovalWorkflowsPage() {
  const [workflows, setWorkflows] = useState([]);
  const [selectedType, setSelectedType] = useState('annual_leave');
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getApprovalWorkflows();
      setWorkflows(data || []);
      const current = (data || []).find((w) => w.request_type === selectedType);
      setSteps(current?.steps?.map((s, i) => ({ ...s, step_order: i + 1 })) || []);
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const current = workflows.find((w) => w.request_type === selectedType);
    setSteps(current?.steps?.map((s, i) => ({ ...s, step_order: i + 1 })) || []);
  }, [selectedType, workflows]);

  function addStep() {
    setSteps((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        step_order: prev.length + 1,
        step_label: 'Approver',
        approver_role: 'department_manager',
      },
    ]);
  }

  function removeStep(index) {
    setSteps((prev) => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step_order: i + 1 })));
  }

  function moveStep(from, to) {
    if (from === to || to < 0 || to >= steps.length) return;
    setSteps((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next.map((s, i) => ({ ...s, step_order: i + 1 }));
    });
  }

  async function handleSave() {
    if (!steps.length) {
      setMessage({ ok: false, text: 'Add at least one approval step.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await adminService.updateApprovalWorkflow(selectedType, {
        name: REQUEST_TYPE_LABELS[selectedType],
        steps: steps.map((s) => ({
          step_order: s.step_order,
          step_label: s.step_label,
          approver_role: s.approver_role,
        })),
      });
      setMessage({ ok: true, text: 'Workflow saved.' });
      await load();
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <div>
        <h1 className="page-title">Approval Workflows</h1>
        <p className="mt-1 text-sm text-ink-muted">Configure multi-level approval chains per request type. Drag steps to reorder.</p>
      </div>

      <GlassCard className="ui-toolbar p-4 flex flex-wrap gap-2">
        {Object.entries(REQUEST_TYPE_LABELS).map(([type, label]) => (
          <button
            key={type}
            type="button"
            onClick={() => setSelectedType(type)}
            aria-pressed={selectedType === type}
            className={`rounded-xl border px-3 py-2 text-sm transition-colors duration-200 ${
              selectedType === type
                ? 'border-accent-200 bg-accent-100 font-semibold text-accent-600'
                : 'border-hairline bg-white text-ink-muted hover:border-accent-200 hover:bg-[#E6F4FA] hover:text-accent-600'
            }`}
          >
            {label}
          </button>
        ))}
      </GlassCard>

      {message && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${message.ok ? 'border-success-border bg-success-surface text-success-ink' : 'border-danger-border bg-danger-surface text-danger-ink'}`}>
          {message.text}
        </div>
      )}

      <GlassCard className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="card-title">{REQUEST_TYPE_LABELS[selectedType]} chain</h2>
          <button type="button" onClick={addStep} className="ui-btn-secondary ui-btn-sm">+ Add step</button>
        </div>

        {loading ? (
          <SkeletonCardList count={3} />
        ) : steps.length === 0 ? (
          <EmptyStateBody
            size="sm"
            icon={ListChecks}
            title="No approval steps yet"
            description="Add the approvers this request type has to pass through, in order. Saving with none loads the defaults."
            action={
              <button type="button" onClick={addStep} className="ui-btn-secondary ui-btn-sm">
                Add first step
              </button>
            }
            className="py-8"
          />
        ) : (
          <ul className="space-y-2">
            {steps.map((step, index) => (
              <li
                key={step.id || index}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { moveStep(dragIndex, index); setDragIndex(null); }}
                className="flex cursor-grab flex-wrap items-center gap-3 rounded-xl border border-hairline bg-accent-50 px-4 py-3 active:cursor-grabbing"
              >
                <span className="w-8 text-xs font-semibold text-ink-muted">#{index + 1}</span>
                <input
                  value={step.step_label}
                  onChange={(e) => setSteps((prev) => prev.map((s, i) => i === index ? { ...s, step_label: e.target.value } : s))}
                  className="ui-input min-w-[120px] flex-1"
                  placeholder="Step label"
                />
                <select
                  value={step.approver_role}
                  onChange={(e) => setSteps((prev) => prev.map((s, i) => i === index ? { ...s, approver_role: e.target.value } : s))}
                  className="ui-select w-auto"
                >
                  {Object.entries(APPROVER_ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <button type="button" onClick={() => removeStep(index)} className="text-xs font-semibold text-red-600 hover:text-red-700">Remove</button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="ui-btn-primary ui-btn-sm"
        >
          {saving ? 'Saving…' : 'Save workflow'}
        </button>
      </GlassCard>
    </div>
  );
}
