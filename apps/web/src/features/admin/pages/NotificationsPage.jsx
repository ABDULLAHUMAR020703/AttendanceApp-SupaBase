import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff } from 'lucide-react';
import { GlassCard } from '../../../shared/components/GlassCard';
import { adminService } from '../services/adminService';
import { useSilentPoll, useSessionState } from '../../../shared/hooks/useSilentPoll';
import { useNotificationStore } from '../../notifications/store/notificationStore';
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Select,
  formatStatusLabel,
} from '../../../shared/components/ui';
import { SkeletonCardList } from '../../../shared/components/ui/Skeleton';

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

      <GlassCard className="ui-toolbar p-4 flex flex-wrap gap-3">
        <Select value={readFilter} onChange={(e) => { setReadFilter(e.target.value); setPage(1); }} className="w-auto min-w-[8rem]">
          <option value="">All</option>
          <option value="false">Unread</option>
          <option value="true">Read</option>
        </Select>
        <Select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="w-auto min-w-[10rem]">
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
      </GlassCard>

      {error && <Alert type="error">{error}</Alert>}

      <div className="space-y-2">
        {loading ? (
          <SkeletonCardList count={4} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={BellOff}
            title="You're all caught up"
            description="Alerts from tickets, leave requests and calendar events will appear here as they happen."
            hint="Filters above may be hiding older items"
          />
        ) : (
          items.map((n) => (
            <GlassCard
              key={n.id}
              role="button"
              tabIndex={0}
              className={`cursor-pointer p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600/40 ${
                n.read ? 'opacity-80' : 'border-accent-200'
              }`}
              onClick={() => handleClick(n)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleClick(n);
                }
              }}
            >
              <div className="flex justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-body-tight font-semibold text-ink">{n.title}</p>
                    {!n.read && <Badge tone="accent" dot>New</Badge>}
                  </div>
                  <p className="mt-1 text-label text-ink-muted">{n.body}</p>
                  <p className="mt-2 text-caption text-ink-faint">
                    {new Date(n.created_at).toLocaleString()} · {formatStatusLabel(n.type)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                  className="ui-btn-danger-soft ui-btn-sm shrink-0"
                >
                  Delete
                </button>
              </div>
            </GlassCard>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm text-ink-muted">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="ui-pager-btn">Previous</button>
          <span className="ui-pager-current" aria-current="page">Page {page} of {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="ui-pager-btn">Next</button>
        </div>
      )}
    </div>
  );
}
