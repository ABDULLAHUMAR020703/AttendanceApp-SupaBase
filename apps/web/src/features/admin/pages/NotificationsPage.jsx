import { useCallback, useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff, X } from 'lucide-react';
import { adminService } from '../services/adminService';
import { useSilentPoll, useSessionState } from '../../../shared/hooks/useSilentPoll';
import { useNotificationStore } from '../../notifications/store/notificationStore';
import { Alert } from '../../../shared/components/ui/Alert';
import { Select } from '../../../shared/components/ui/Select';
import { EmptyStateBody } from '../../../shared/components/ui/EmptyState';
import { SkeletonFeed } from '../../../shared/components/ui/Skeleton';
import { AppIcon } from '../../../shared/components/AppIcon';
import { notificationKindMeta } from '../../../shared/lib/notificationIcons';

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'approval', label: 'Approvals' },
  { value: 'leave_request', label: 'Leave updates' },
  { value: 'ticket_created', label: 'Tickets' },
  { value: 'ticket_assigned', label: 'Assignments' },
  { value: 'work_mode', label: 'Work mode' },
  { value: 'calendar_event', label: 'Calendar' },
  { value: 'general', label: 'System' },
];

const READ_FILTERS = [
  { id: '', label: 'All' },
  { id: 'false', label: 'Unread' },
  { id: 'true', label: 'Read' },
];


function notificationDestination(notification) {
  const type = String(notification?.type || '').toLowerCase();
  if (type.startsWith('ticket')) return { to: '/tickets', label: 'Open ticket' };
  if (type.includes('leave')) return { to: '/leaves', label: 'Open leave' };
  if (type.includes('work_mode') || type === 'remote_work') return { to: '/work-mode-requests', label: 'Open request' };
  if (type.includes('calendar')) return { to: '/calendar', label: 'Open calendar' };
  if (type.includes('approval')) return { to: '/approval-workflows', label: 'Open approvals' };
  if (type.includes('attendance') || type.includes('check_in') || type.includes('late')) {
    return { to: '/attendance', label: 'Open attendance' };
  }
  if (type.includes('geofence') || type.includes('site')) return { to: '/sites', label: 'Open sites' };
  if (type.includes('signup')) return { to: '/users', label: 'Open users' };
  return null;
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function isToday(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return date >= startOfToday();
}

function formatRelative(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (isToday(iso)) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const hours = Math.round(mins / 60);
  if (hours < 48) return 'Yesterday';
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function groupByDay(items) {
  const today = [];
  const earlier = [];
  for (const item of items) {
    if (isToday(item.created_at || item.createdAt)) today.push(item);
    else earlier.push(item);
  }
  return [
    today.length ? { id: 'today', label: 'Today', items: today } : null,
    earlier.length ? { id: 'earlier', label: 'Earlier', items: earlier } : null,
  ].filter(Boolean);
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const { refresh: refreshBadge, clear: clearBadge, decrement } = useNotificationStore();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useSessionState('notifications:page', 1);
  const [readFilter, setReadFilter] = useSessionState('notifications:readFilter', '');
  const [typeFilter, setTypeFilter] = useSessionState('notifications:type', '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const limit = 20;

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setError('');
      try {
        const res = await adminService.getNotifications({
          page,
          limit,
          read: readFilter || undefined,
          type: typeFilter || undefined,
        });
        const live = Array.isArray(res.data) ? res.data : [];
        setItems(live);
        setTotal(res.total || live.length);
        await refreshBadge();
      } catch (err) {
        if (!silent) setError(err.message || 'Failed to load notifications');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [page, readFilter, typeFilter, refreshBadge]
  );

  useEffect(() => {
    load();
  }, [load]);
  useSilentPoll(load, 30000, [page, readFilter, typeFilter]);

  async function markRead(id) {
    await adminService.markNotificationRead(id);
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, read: true } : item)));
    decrement();
  }

  async function markAllRead() {
    setBusy(true);
    setError('');
    try {
      await adminService.markAllNotificationsRead();
      setItems((prev) => prev.map((item) => ({ ...item, read: true })));
      clearBadge();
    } catch (err) {
      setError(err.message || 'Failed to mark all as read');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    await adminService.deleteNotification(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
    await refreshBadge();
  }

  async function handleClick(item) {
    if (!item.read) await markRead(item.id);
    const destination = notificationDestination(item);
    if (destination) navigate(destination.to);
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const filtersActive = Boolean(readFilter || typeFilter);
  const groups = useMemo(() => groupByDay(items), [items]);
  const hasUnread = items.some((item) => !item.read) || unreadCount > 0;

  function clearFilters() {
    setReadFilter('');
    setTypeFilter('');
    setPage(1);
  }

  return (
    <div className="notifications-directory admin-page gap-4 animate-fade-up">
      <div className="filter-action-bar">
        <div className="ui-segment" role="tablist" aria-label="Read state">
          {READ_FILTERS.map((item) => (
            <button
              key={item.id || 'all'}
              type="button"
              role="tab"
              aria-selected={readFilter === item.id}
              onClick={() => {
                setReadFilter(item.id);
                setPage(1);
              }}
              className={`ui-segment-item ${readFilter === item.id ? 'ui-segment-item-active' : ''}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <Select
          size="sm"
          value={typeFilter}
          onChange={(event) => {
            setTypeFilter(event.target.value);
            setPage(1);
          }}
          aria-label="Filter by type"
          className="w-auto min-w-[10rem]"
        >
          {TYPE_OPTIONS.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <p className="text-xs tabular-nums text-slate-400">
          {total} {total === 1 ? 'notification' : 'notifications'}
        </p>
        <button type="button" onClick={markAllRead} disabled={busy || !hasUnread} className="ui-btn-secondary ui-btn-sm ml-auto">
          Mark all as read
        </button>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <section className="notifications-inbox">
        {loading ? (
          <div className="px-4 py-4">
            <SkeletonFeed count={6} />
          </div>
        ) : items.length === 0 ? (
          <EmptyStateBody
            icon={BellOff}
            title={filtersActive ? 'No matching alerts' : "You're all caught up"}
            description={
              filtersActive
                ? 'Nothing matches the filters above. Clear them to see the rest of your inbox.'
                : 'Approvals, leave updates, attendance alerts and system notices will land here.'
            }
            action={
              filtersActive ? (
                <button type="button" onClick={clearFilters} className="ui-btn-secondary ui-btn-sm">
                  Clear filters
                </button>
              ) : null
            }
            className="py-12"
          />
        ) : (
          groups.map((group) => (
            <section key={group.id} className="notifications-group">
              <h2 className="notifications-group-label">{group.label}</h2>
              <ul>
                {group.items.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    onOpen={() => handleClick(item)}
                    onDelete={() => remove(item.id)}
                  />
                ))}
              </ul>
            </section>
          ))
        )}
      </section>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 text-sm text-slate-500">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="ui-pager-btn">
            Previous
          </button>
          <span className="ui-pager-current" aria-current="page">
            Page {page} of {totalPages}
          </span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="ui-pager-btn">
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationRow({ item, onOpen, onDelete }) {
  const kind = notificationKindMeta(item.type);
  const Icon = kind.Icon;
  const destination = notificationDestination(item);
  const unread = !item.read;
  const message = String(item.body || item.title || '').trim();
  const title = String(item.title || kind.label).trim();

  return (
    <li>
      <div className={`notifications-row ${unread ? 'is-unread' : ''}`}>
        <button type="button" className="notifications-row-main" onClick={onOpen}>
          <span className={`notifications-icon ${unread ? 'is-unread' : ''}`} aria-hidden>
            <AppIcon icon={Icon} />
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="flex items-baseline gap-2">
              <span className={`block truncate text-sm ${unread ? 'font-semibold text-slate-900' : 'font-medium text-slate-800'}`}>
                {title}
              </span>
              {unread && <span className="notifications-unread-dot" aria-label="Unread" />}
            </span>
            {message && message !== title && (
              <span className="mt-0.5 block truncate text-sm text-slate-500">{message}</span>
            )}
            <span className="mt-1 block text-[11px] text-slate-400">
              {kind.label}
              {formatRelative(item.created_at) ? ` · ${formatRelative(item.created_at)}` : ''}
            </span>
          </span>
        </button>
        <div className="notifications-row-aside">
          {destination && (
            <button type="button" onClick={onOpen} className="notifications-action">
              {destination.label}
            </button>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onDelete();
            }}
            className="notifications-dismiss"
            aria-label="Delete notification"
          >
            <X className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
          </button>
        </div>
      </div>
    </li>
  );
}
