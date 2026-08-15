import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MousePointerClick, Ticket } from 'lucide-react';
import { GlassCard } from '../../../shared/components/GlassCard';
import { PermissionGate } from '../../../shared/components/PermissionGate';
import { adminService } from '../services/adminService';
import { PERMISSIONS } from '../permissions';
import { useSilentPoll, useSessionState } from '../../../shared/hooks/useSilentPoll';
import { useNotificationStore } from '../../notifications/store/notificationStore';
import {
  Alert,
  EmptyStateBody,
  PageHeader,
  StatusBadge,
  formatStatusLabel,
} from '../../../shared/components/ui';
import { SkeletonFeed } from '../../../shared/components/ui/Skeleton';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const emptyForm = { category: '', priority: 'medium', subject: '', description: '' };

export function TicketsPage() {
  const navigate = useNavigate();
  const refreshBadge = useNotificationStore((s) => s.refresh);
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedId, setSelectedId] = useSessionState('tickets:selected', '');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [assignTo, setAssignTo] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [ticketData, userData, deptData] = await Promise.all([
        adminService.getTickets(),
        adminService.getUsers().catch(() => []),
        adminService.getDepartments().catch(() => []),
      ]);
      setTickets(ticketData || []);
      setUsers((userData || []).filter((u) => u.is_active !== false));
      setDepartments(deptData || []);
    } catch (err) {
      if (!silent) setError(err.message || 'Failed to load tickets');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useSilentPoll(load, 30000, []);

  const selected = tickets.find((t) => t.id === selectedId) || null;

  async function handleCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const created = await adminService.createTicket({
        ...form,
        category: form.category || departments[0]?.id || '',
      });
      setSuccess('Ticket created.');
      setShowCreate(false);
      setForm(emptyForm);
      setSelectedId(created.id);
      await load(true);
      await refreshBadge();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleAssign() {
    if (!selected || !assignTo) return;
    setBusy(true);
    setError('');
    try {
      await adminService.assignTicket(selected.id, assignTo);
      setSuccess('Ticket assigned.');
      await load(true);
      await refreshBadge();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleClose() {
    if (!selected) return;
    if (!window.confirm('Close this ticket?')) return;
    setBusy(true);
    setError('');
    try {
      await adminService.closeTicket(selected.id);
      setSuccess('Ticket closed.');
      await load(true);
      await refreshBadge();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 animate-fade-up">
      <PageHeader title="Tickets" subtitle="Support ticket management" onRefresh={() => load()} />

      {error && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="max-h-[28rem] space-y-2 overflow-y-auto p-4 lg:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="card-title">Tickets ({tickets.length})</h2>
            <PermissionGate permission={PERMISSIONS.MANAGE_TICKETS}>
              <button type="button" onClick={() => setShowCreate((v) => !v)} className="ui-btn-secondary ui-btn-sm">
                {showCreate ? 'Cancel' : 'New'}
              </button>
            </PermissionGate>
          </div>
          {loading ? (
            <SkeletonFeed count={4} className="pt-1" />
          ) : tickets.length === 0 ? (
            <EmptyStateBody
              size="sm"
              icon={Ticket}
              title="No tickets yet"
              description="Raise a ticket to track an issue through to resolution."
              className="py-6"
            />
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={`w-full rounded-xl border px-3 py-2.5 text-left transition-all duration-200 ease-premium ${
                  selectedId === t.id
                    ? 'border-accent-200 bg-accent-50'
                    : 'border-hairline bg-white hover:border-accent-200 hover:bg-accent-50/60'
                }`}
              >
                <p className="truncate text-body-tight font-medium text-ink">{t.subject}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <StatusBadge status={t.status} />
                  <span className="text-caption text-ink-muted">{formatStatusLabel(t.priority)}</span>
                </div>
              </button>
            ))
          )}
        </GlassCard>

        <GlassCard className="p-5 lg:col-span-2 space-y-4">
          {showCreate && (
            <PermissionGate permission={PERMISSIONS.MANAGE_TICKETS}>
              <form onSubmit={handleCreate} className="space-y-3 border-b border-hairline pb-4">
                <h3 className="text-sm font-medium text-ink">Create ticket</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select required value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="ui-select">
                    <option value="">Department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className="ui-select">
                    {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <input required placeholder="Subject" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className="ui-input w-full" />
                <textarea required rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="ui-textarea w-full" />
                <button type="submit" disabled={busy} className="ui-btn-primary">Create Ticket</button>
              </form>
            </PermissionGate>
          )}

          {!selected ? (
            <EmptyStateBody
              icon={MousePointerClick}
              title="Select a ticket"
              description="Pick a ticket from the list to read its history, assign an owner or close it out."
              className="py-10"
            />
          ) : (
            <>
              <div>
                <h2 className="section-title">{selected.subject}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <span className="ui-badge ui-badge-neutral">{formatStatusLabel(selected.priority)}</span>
                  <span className="text-caption text-ink-muted">Raised by {selected.created_by}</span>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-body text-ink">{selected.description}</p>
                {selected.assigned_to && (
                  <p className="mt-2 text-caption text-ink-muted">Assigned to {selected.assigned_to}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <PermissionGate permission={PERMISSIONS.ASSIGN_TICKETS}>
                  {selected.status !== 'closed' && (
                    <div className="flex gap-2 items-center">
                      <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="ui-select ui-input-sm w-auto">
                        <option value="">Assign to…</option>
                        {users.filter((u) => u.role !== 'employee').map((u) => (
                          <option key={u.uid} value={u.username}>{u.name || u.username}</option>
                        ))}
                      </select>
                      <button type="button" disabled={!assignTo || busy} onClick={handleAssign} className="ui-btn-secondary ui-btn-sm">Assign</button>
                    </div>
                  )}
                </PermissionGate>
                <PermissionGate permission={PERMISSIONS.CLOSE_TICKETS}>
                  {selected.status !== 'closed' && (
                    <button type="button" disabled={busy} onClick={handleClose} className="ui-btn-success ui-btn-sm">Close Ticket</button>
                  )}
                </PermissionGate>
                <button type="button" onClick={() => navigate('/notifications')} className="ui-btn-secondary ui-btn-sm">View notifications</button>
              </div>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
