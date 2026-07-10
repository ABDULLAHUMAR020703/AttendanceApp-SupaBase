import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../../shared/components/GlassCard';
import { adminService } from '../services/adminService';
import { useSilentPoll, useSessionState } from '../../../shared/hooks/useSilentPoll';
import { useNotificationStore } from '../../notifications/store/notificationStore';
import { Alert, Button, EmptyState, PageHeader, Select } from '../../../shared/components/ui';

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'ticket_created', label: 'Tickets' },
  { value: 'ticket_assigned', label: 'Assignments' },
  { value: 'calendar_event', label: 'Calendar' },
  { value: 'general', label: 'General' },
];

function notificationLink(n, navigate) {
  const type = n.type || '';
  const id = n.data?.ticketId || n.data?.eventId;
  if (type.startsWith('ticket') && id) navigate('/tickets');
  else if (type === 'calendar_event') navigate('/calendar');
  else if (type.includes('leave')) navigate('/leaves');
  else if (type.includes('work_mode') || type === 'remote_work') navigate('/work-mode-requests');
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const { refresh: refreshBadge, clear: clearBadge, decrement } = useNotificationStore();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useSessionState('notifications:page', 1);
  const [readFilter, setReadFilter] = useSessionState('notifications:readFilter', '');
  const [typeFilter, setTypeFilter] = useSessionState('notifications:type', '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const limit = 20;

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await adminService.getNotifications({
        page,
        limit,
        read: readFilter || undefined,
        type: typeFilter || undefined,
      });
      setItems(res.data || []);
      setTotal(res.total || 0);
      await refreshBadge();
    } catch (err) {
      if (!silent) setError(err.message || 'Failed to load notifications');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, readFilter, typeFilter, refreshBadge]);

  useEffect(() => { load(); }, [load]);
  useSilentPoll(load, 30000, [page, readFilter, typeFilter]);

  async function markRead(id) {
    await adminService.markNotificationRead(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    decrement();
  }

  async function markAllRead() {
    await adminService.markAllNotificationsRead();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    clearBadge();
  }

  async function remove(id) {
    await adminService.deleteNotification(id);
    setItems((prev) => prev.filter((n) => n.id !== id));
    await refreshBadge();
  }

  async function handleClick(n) {
    if (!n.read) await markRead(n.id);
    notificationLink(n, navigate);
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="page-container">
      <PageHeader
        title="Notifications"
        subtitle="In-app notification center (synced with mobile)"
        onRefresh={() => load()}
        refreshing={loading}
        actions={<Button variant="secondary" size="sm" onClick={markAllRead}>Mark all read</Button>}
      />

      <GlassCard className="p-4 flex flex-wrap gap-3">
        <Select value={readFilter} onChange={(e) => { setReadFilter(e.target.value); setPage(1); }} className="w-auto min-w-[8rem]">
          <option value="" className="bg-slate-800">All</option>
          <option value="false" className="bg-slate-800">Unread</option>
          <option value="true" className="bg-slate-800">Read</option>
        </Select>
        <Select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="w-auto min-w-[10rem]">
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value} className="bg-slate-800">{o.label}</option>)}
        </Select>
      </GlassCard>

      {error && <Alert type="error">{error}</Alert>}

      <div className="space-y-2">
        {loading ? (
          <div className="h-24 skeleton rounded-card" />
        ) : items.length === 0 ? (
          <EmptyState
            title="No notifications"
            description="You're all caught up. New alerts from tickets, leaves, and calendar will appear here."
            icon={<svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" /><path d="M9 17a3 3 0 0 0 6 0" /></svg>}
          />
        ) : (
          items.map((n) => (
            <GlassCard
              key={n.id}
              className={`p-4 cursor-pointer transition-all hover:bg-white/10 ${n.read ? 'opacity-75' : 'border-blue-300/20'}`}
              onClick={() => handleClick(n)}
            >
              <div className="flex justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white">{n.title}</p>
                  <p className="text-sm text-slate-300 mt-1">{n.body}</p>
                  <p className="text-xs text-slate-500 mt-2">{new Date(n.created_at).toLocaleString()} · {n.type}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                  className="text-xs text-red-300 hover:text-red-200 shrink-0"
                >
                  Delete
                </button>
              </div>
            </GlassCard>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm text-slate-300">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="disabled:opacity-40">Previous</button>
          <span>Page {page} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
