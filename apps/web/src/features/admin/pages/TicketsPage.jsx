import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../../shared/components/GlassCard';
import { PermissionGate } from '../../../shared/components/PermissionGate';
import { adminService } from '../services/adminService';
import { PERMISSIONS } from '../permissions';
import { useSilentPoll, useSessionState } from '../../../shared/hooks/useSilentPoll';
import { useNotificationStore } from '../../notifications/store/notificationStore';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const STATUS_COLORS = {
  open: 'text-blue-200',
  in_progress: 'text-amber-200',
  resolved: 'text-green-200',
  closed: 'text-slate-400',
};

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Tickets</h1>
          <p className="mt-1 text-sm text-slate-300">Support ticket management</p>
        </div>
        <button type="button" onClick={() => load()} className="text-xs text-blue-200 underline">Refresh</button>
      </div>

      {error && <GlassCard className="p-3 text-sm text-red-100">{error}</GlassCard>}
      {success && <GlassCard className="p-3 text-sm text-green-100">{success}</GlassCard>}

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-4 lg:col-span-1 space-y-2 max-h-[28rem] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-white">Tickets ({tickets.length})</h2>
            <PermissionGate permission={PERMISSIONS.MANAGE_TICKETS}>
              <button type="button" onClick={() => setShowCreate((v) => !v)} className="text-xs text-blue-200 underline">
                {showCreate ? 'Cancel' : 'New'}
              </button>
            </PermissionGate>
          </div>
          {loading ? (
            <div className="h-20 skeleton rounded-lg" />
          ) : tickets.length === 0 ? (
            <p className="text-sm text-slate-400">No tickets yet.</p>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelectedId(t.id)}
                className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-all ${selectedId === t.id ? 'border-blue-300/40 bg-blue-500/15' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
              >
                <p className="text-slate-100 font-medium truncate">{t.subject}</p>
                <p className={`text-xs capitalize mt-0.5 ${STATUS_COLORS[t.status] || 'text-slate-400'}`}>{t.status?.replace(/_/g, ' ')}</p>
              </button>
            ))
          )}
        </GlassCard>

        <GlassCard className="p-5 lg:col-span-2 space-y-4">
          {showCreate && (
            <PermissionGate permission={PERMISSIONS.MANAGE_TICKETS}>
              <form onSubmit={handleCreate} className="space-y-3 border-b border-white/10 pb-4">
                <h3 className="text-sm font-medium text-white">Create ticket</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select required value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100">
                    <option value="" className="bg-slate-800">Department</option>
                    {departments.map((d) => <option key={d.id} value={d.id} className="bg-slate-800">{d.name}</option>)}
                  </select>
                  <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} className="rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100">
                    {PRIORITIES.map((p) => <option key={p} value={p} className="bg-slate-800">{p}</option>)}
                  </select>
                </div>
                <input required placeholder="Subject" value={form.subject} onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))} className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100" />
                <textarea required rows={3} placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100" />
                <button type="submit" disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">Create Ticket</button>
              </form>
            </PermissionGate>
          )}

          {!selected ? (
            <p className="text-sm text-slate-400">Select a ticket to view details and actions.</p>
          ) : (
            <>
              <div>
                <h2 className="text-lg font-medium text-white">{selected.subject}</h2>
                <p className="text-xs text-slate-400 mt-1">
                  By {selected.created_by} · {selected.priority} · <span className="capitalize">{selected.status?.replace(/_/g, ' ')}</span>
                </p>
                <p className="text-sm text-slate-200 mt-3 whitespace-pre-wrap">{selected.description}</p>
                {selected.assigned_to && <p className="text-xs text-slate-400 mt-2">Assigned to: {selected.assigned_to}</p>}
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <PermissionGate permission={PERMISSIONS.ASSIGN_TICKETS}>
                  {selected.status !== 'closed' && (
                    <div className="flex gap-2 items-center">
                      <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)} className="rounded border border-white/20 bg-white/10 px-2 py-1.5 text-xs text-slate-100">
                        <option value="" className="bg-slate-800">Assign to…</option>
                        {users.filter((u) => u.role !== 'employee').map((u) => (
                          <option key={u.uid} value={u.username} className="bg-slate-800">{u.name || u.username}</option>
                        ))}
                      </select>
                      <button type="button" disabled={!assignTo || busy} onClick={handleAssign} className="rounded border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-slate-100 disabled:opacity-50">Assign</button>
                    </div>
                  )}
                </PermissionGate>
                <PermissionGate permission={PERMISSIONS.CLOSE_TICKETS}>
                  {selected.status !== 'closed' && (
                    <button type="button" disabled={busy} onClick={handleClose} className="rounded border border-green-300/30 bg-green-500/20 px-3 py-1.5 text-xs text-green-100 disabled:opacity-50">Close Ticket</button>
                  )}
                </PermissionGate>
                <button type="button" onClick={() => navigate('/notifications')} className="rounded border border-white/15 px-3 py-1.5 text-xs text-slate-300">View notifications</button>
              </div>
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
