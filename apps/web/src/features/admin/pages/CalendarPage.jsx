import { useCallback, useEffect, useState } from 'react';
import { GlassCard } from '../../../shared/components/GlassCard';
import { PermissionGate } from '../../../shared/components/PermissionGate';
import { adminService } from '../services/adminService';
import { PERMISSIONS } from '../permissions';
import { useSilentPoll, useSessionState } from '../../../shared/hooks/useSilentPoll';

const EVENT_TYPES = [
  { value: 'meeting', label: 'Meeting' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'other', label: 'Other' },
];

const emptyForm = {
  title: '',
  description: '',
  date: '',
  time: '',
  type: 'meeting',
  visibility: 'all',
};

function validateEvent(form) {
  if (!form.title?.trim()) return 'Title is required';
  if (!form.date) return 'Date is required';
  if (form.date && !/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return 'Date must be YYYY-MM-DD';
  return null;
}

export function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mode, setMode] = useSessionState('calendar:mode', 'list');
  const [selectedId, setSelectedId] = useSessionState('calendar:selected', '');
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await adminService.getCalendarEvents();
      setEvents(data || []);
    } catch (err) {
      if (!silent) setError(err.message || 'Failed to load events');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useSilentPoll(load, 30000, []);

  const selected = events.find((e) => e.id === selectedId);

  function startCreate() {
    setMode('create');
    setForm(emptyForm);
    setSelectedId('');
  }

  function startEdit(event) {
    setMode('edit');
    setSelectedId(event.id);
    setForm({
      title: event.title || '',
      description: event.description || '',
      date: event.date?.split?.('T')?.[0] || event.date || '',
      time: event.time || '',
      type: event.type || 'other',
      visibility: event.visibility || 'all',
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validateEvent(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      if (mode === 'edit' && selectedId) {
        await adminService.updateCalendarEvent(selectedId, form);
        setSuccess('Event updated.');
      } else {
        const created = await adminService.createCalendarEvent(form);
        setSelectedId(created.id);
        setSuccess('Event created.');
      }
      setMode('list');
      await load(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!selectedId || !window.confirm('Delete this event?')) return;
    setBusy(true);
    try {
      await adminService.deleteCalendarEvent(selectedId);
      setSuccess('Event deleted.');
      setSelectedId('');
      setMode('list');
      await load(true);
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
          <h1 className="text-2xl font-semibold text-white">Calendar</h1>
          <p className="mt-1 text-sm text-slate-300">Company events and reminders</p>
        </div>
        <div className="flex gap-2">
          <PermissionGate permission={PERMISSIONS.CREATE_EVENTS}>
            <button type="button" onClick={startCreate} className="rounded-lg bg-indigo-600 px-3 py-2 text-sm text-white">Create Event</button>
          </PermissionGate>
          <button type="button" onClick={() => load()} className="text-xs text-blue-200 underline self-center">Refresh</button>
        </div>
      </div>

      {error && <GlassCard className="p-3 text-sm text-red-100">{error}</GlassCard>}
      {success && <GlassCard className="p-3 text-sm text-green-100">{success}</GlassCard>}

      {(mode === 'create' || mode === 'edit') && (
        <PermissionGate anyOf={[PERMISSIONS.CREATE_EVENTS, PERMISSIONS.EDIT_EVENTS]}>
          <GlassCard className="p-5">
            <form onSubmit={handleSubmit} className="space-y-3">
              <h2 className="text-sm font-medium text-white">{mode === 'edit' ? 'Edit Event' : 'Create Event'}</h2>
              <input required placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100" />
              <textarea rows={2} placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100" />
              <div className="grid gap-3 sm:grid-cols-3">
                <input required type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100" />
                <input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} className="rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100" />
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100">
                  {EVENT_TYPES.map((t) => <option key={t.value} value={t.value} className="bg-slate-800">{t.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">{mode === 'edit' ? 'Save' : 'Create'}</button>
                <button type="button" onClick={() => setMode('list')} className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200">Cancel</button>
                {mode === 'edit' && (
                  <PermissionGate permission={PERMISSIONS.DELETE_EVENTS}>
                    <button type="button" onClick={handleDelete} disabled={busy} className="rounded-lg border border-red-300/30 bg-red-500/15 px-4 py-2 text-sm text-red-100">Delete</button>
                  </PermissionGate>
                )}
              </div>
            </form>
          </GlassCard>
        </PermissionGate>
      )}

      <GlassCard className="p-4 space-y-2">
        {loading ? (
          <div className="h-24 skeleton rounded-lg" />
        ) : events.length === 0 ? (
          <p className="text-sm text-slate-400">No events scheduled.</p>
        ) : (
          events.map((ev) => (
            <div key={ev.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <p className="text-slate-100 font-medium">{ev.title}</p>
                <p className="text-xs text-slate-400">{ev.date}{ev.time ? ` · ${ev.time}` : ''} · {ev.type}</p>
              </div>
              <PermissionGate permission={PERMISSIONS.EDIT_EVENTS}>
                <button type="button" onClick={() => startEdit(ev)} className="text-xs text-blue-200 underline">Edit</button>
              </PermissionGate>
            </div>
          ))
        )}
      </GlassCard>
    </div>
  );
}
