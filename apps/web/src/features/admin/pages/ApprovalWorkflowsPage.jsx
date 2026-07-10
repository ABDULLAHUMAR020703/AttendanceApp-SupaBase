import { useCallback, useEffect, useState } from 'react';
import { GlassCard } from '../../../shared/components/GlassCard';
import { adminService } from '../services/adminService';

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
        <h1 className="text-2xl font-semibold text-white">Approval Workflows</h1>
        <p className="text-sm text-slate-300 mt-1">Configure multi-level approval chains per request type. Drag steps to reorder.</p>
      </div>

      <GlassCard className="p-4 flex flex-wrap gap-2">
        {Object.entries(REQUEST_TYPE_LABELS).map(([type, label]) => (
          <button
            key={type}
            type="button"
            onClick={() => setSelectedType(type)}
            className={`rounded-lg px-3 py-2 text-sm border transition-all ${
              selectedType === type
                ? 'border-blue-300/40 bg-blue-500/25 text-blue-100'
                : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </GlassCard>

      {message && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${message.ok ? 'border-green-300/25 bg-green-500/15 text-green-100' : 'border-red-300/25 bg-red-500/15 text-red-100'}`}>
          {message.text}
        </div>
      )}

      <GlassCard className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-white">{REQUEST_TYPE_LABELS[selectedType]} chain</h2>
          <button type="button" onClick={addStep} className="text-sm text-blue-200 hover:text-blue-100 underline">+ Add step</button>
        </div>

        {loading ? (
          <div className="h-24 skeleton rounded-xl" />
        ) : steps.length === 0 ? (
          <p className="text-sm text-slate-400">No steps configured. Add steps or save to load defaults.</p>
        ) : (
          <ul className="space-y-2">
            {steps.map((step, index) => (
              <li
                key={step.id || index}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { moveStep(dragIndex, index); setDragIndex(null); }}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-white/15 bg-white/5 px-4 py-3 cursor-grab active:cursor-grabbing"
              >
                <span className="text-xs text-slate-400 w-8">#{index + 1}</span>
                <input
                  value={step.step_label}
                  onChange={(e) => setSteps((prev) => prev.map((s, i) => i === index ? { ...s, step_label: e.target.value } : s))}
                  className="flex-1 min-w-[120px] rounded border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-slate-100"
                  placeholder="Step label"
                />
                <select
                  value={step.approver_role}
                  onChange={(e) => setSteps((prev) => prev.map((s, i) => i === index ? { ...s, approver_role: e.target.value } : s))}
                  className="rounded border border-white/20 bg-white/10 px-2 py-1.5 text-sm text-slate-100"
                >
                  {Object.entries(APPROVER_ROLE_LABELS).map(([value, label]) => (
                    <option key={value} value={value} className="bg-slate-800">{label}</option>
                  ))}
                </select>
                <button type="button" onClick={() => removeStep(index)} className="text-xs text-red-300 hover:text-red-200">Remove</button>
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg border border-blue-300/30 bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-100 hover:bg-blue-500/35 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save workflow'}
        </button>
      </GlassCard>
    </div>
  );
}
