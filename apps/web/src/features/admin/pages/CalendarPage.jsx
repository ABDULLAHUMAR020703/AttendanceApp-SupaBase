import { useCallback, useEffect, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import { GlassCard } from '../../../shared/components/GlassCard';
import { PermissionGate } from '../../../shared/components/PermissionGate';
import { adminService } from '../services/adminService';
import { PERMISSIONS } from '../permissions';
import { useSilentPoll, useSessionState } from '../../../shared/hooks/useSilentPoll';
import { EmptyStateBody } from '../../../shared/components/ui/EmptyState';
import { SkeletonFeed } from '../../../shared/components/ui/Skeleton';
import { formatStatusLabel } from '../../../shared/components/ui/Badge';

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
            <button type="button" onClick={startCreate} className="ui-btn-primary ui-btn-sm">Create Event</button>
          </PermissionGate>
          <button type="button" onClick={() => load()} className="ui-btn-secondary ui-btn-sm self-center">Refresh</button>
        </div>
      </div>

      {error && <GlassCard className="p-3 text-sm text-red-100">{error}</GlassCard>}
      {success && <GlassCard className="p-3 text-sm text-green-100">{success}</GlassCard>}

      {(mode === 'create' || mode === 'edit') && (
        <PermissionGate anyOf={[PERMISSIONS.CREATE_EVENTS, PERMISSIONS.EDIT_EVENTS]}>
          <GlassCard className="p-5">
            <form onSubmit={handleSubmit} className="space-y-3">
              <h2 className="text-sm font-medium text-white">{mode === 'edit' ? 'Edit Event' : 'Create Event'}</h2>
              <input required placeholder="Title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="ui-input" />
              <textarea rows={2} placeholder="Description" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="ui-textarea" />
              <div className="grid gap-3 sm:grid-cols-3">
                <input required type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="ui-input" />
                <input type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} className="ui-input" />
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="ui-select">
                  {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={busy} className="ui-btn-primary ui-btn-sm">{mode === 'edit' ? 'Save' : 'Create'}</button>
                <button type="button" onClick={() => setMode('list')} className="ui-btn-secondary ui-btn-sm">Cancel</button>
                {mode === 'edit' && (
                  <PermissionGate permission={PERMISSIONS.DELETE_EVENTS}>
                    <button type="button" onClick={handleDelete} disabled={busy} className="ui-btn-danger-soft ui-btn-sm">Delete</button>
                  </PermissionGate>
                )}
              </div>
            </form>
          </GlassCard>
        </PermissionGate>
      )}

      <GlassCard className="space-y-2 p-4">
        {loading ? (
          <SkeletonFeed count={4} />
        ) : events.length === 0 ? (
          <EmptyStateBody
            size="sm"
            icon={CalendarPlus}
            title="No events scheduled"
            description="Holidays, company-wide events and shift notes you add here are visible to every employee."
            className="py-8"
          />
        ) : (
          events.map((ev) => (
            <div
              key={ev.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-hairline bg-surface-subtle px-4 py-3 transition-colors duration-200 ease-premium hover:border-accent-200 hover:bg-accent-50"
            >
              <div className="min-w-0">
                <p className="truncate text-body-tight font-medium text-ink">{ev.title}</p>
                <p className="mt-0.5 text-caption text-ink-muted">
                  {ev.date}
                  {ev.time ? ` · ${ev.time}` : ''} · {formatStatusLabel(ev.type)}
                </p>
              </div>
              <PermissionGate permission={PERMISSIONS.EDIT_EVENTS}>
                <button type="button" onClick={() => startEdit(ev)} className="ui-btn-secondary ui-btn-sm">Edit</button>
              </PermissionGate>
            </div>
          ))
        )}
      </GlassCard>
    </div>
  );
}
