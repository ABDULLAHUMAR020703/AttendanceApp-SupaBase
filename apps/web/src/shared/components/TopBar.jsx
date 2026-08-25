import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellOff,
  Building2,
  CalendarDays,
  Menu,
  Plus,
  Ticket,
  UserPlus,
} from 'lucide-react';
import { AppIcon } from './AppIcon';
import { notificationKindMeta } from '../lib/notificationIcons';
import { AnimatePresence, motion } from 'framer-motion';
import { adminService } from '../../features/admin/services/adminService';
import { useDismiss } from '../lib/useDismiss';
import { NAV_SECTIONS } from './navConfig';
import { usePageChrome } from './pageChrome';
import { CountBadge } from './ui/CountBadge';
import { EmptyStateBody } from './ui/EmptyState';
import { MenuItem, MenuLabel, MenuPanel, useMenuNavigation } from './ui/Menu';
import { SkeletonFeed } from './ui/Skeleton';

/** Route → { section, label } so the header can title itself from the nav config. */
const ROUTE_INDEX = NAV_SECTIONS.reduce((acc, section) => {
  section.items.forEach((item) => {
    acc[item.to] = { section: section.label, label: item.label };
  });
  return acc;
}, {
  '/notifications': { section: 'Main', label: 'Notifications' },
  '/settings': { section: null, label: 'Settings' },
});

function routeMeta(pathname) {
  const exact = ROUTE_INDEX[pathname];
  if (exact) return exact;
  const prefix = Object.keys(ROUTE_INDEX).find((to) => pathname.startsWith(`${to}/`));
  return prefix ? ROUTE_INDEX[prefix] : { section: null, label: 'Hadir.ai' };
}


/*
 * Popover roots span the full header height, so `top-full` always resolves to the
 * header's bottom edge no matter how tall the triggers themselves are.
 */
const POPOVER_ROOT = 'relative flex h-full items-center';
/* Trigger-anchored dropdown: `ui-menu` carries the panel styling and entry motion. */
const PANEL = 'ui-menu absolute right-0 top-[calc(100%+0.5rem)] z-30 w-60';
/* Borderless 32px square: the container only appears on hover, Linear-style. */
const HEADER_ICON_BTN =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-all duration-200 ease-premium hover:bg-[#E6F4FA] hover:text-accent-600 active:scale-95';

/** Create-shortcuts, filtered to the destinations this user can reach. */
function QuickActions({ canSee }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const { containerRef, onKeyDown } = useMenuNavigation({ open, onClose: close });
  const ref = useDismiss(close, containerRef);

  const actions = useMemo(
    () =>
      [
        { label: 'Invite user', icon: UserPlus, to: '/users', feature: 'users', state: { openCreate: true } },
        {
          label: 'New department',
          icon: Building2,
          to: '/departments',
          feature: 'departments',
          state: { focusCreate: true },
        },
        { label: 'Log a ticket', icon: Ticket, to: '/tickets', feature: 'tickets' },
        { label: 'Add calendar event', icon: CalendarDays, to: '/calendar', feature: 'calendar' },
      ].filter((action) => canSee({ to: action.to, feature: action.feature })),
    [canSee],
  );

  if (actions.length === 0) return null;

  return (
    <div ref={ref} className={POPOVER_ROOT}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[#00B0FF] px-2.5 text-label font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-[#0099E6] active:scale-95"
      >
        <Plus
          className={`h-[15px] w-[15px] icon-rotate ${open ? 'rotate-45' : ''}`}
          strokeWidth={2.25}
          aria-hidden
        />
        <span className="hidden sm:inline">New</span>
      </button>

      <AnimatePresence>
        {open && (
          <MenuPanel label="Quick actions" className={PANEL} containerRef={containerRef} onKeyDown={onKeyDown}>
            <MenuLabel>Create</MenuLabel>
            {actions.map((action) => (
              <MenuItem
                key={action.label}
                icon={action.icon}
                onSelect={() => {
                  close();
                  navigate(action.to, action.state ? { state: action.state } : undefined);
                }}
              >
                {action.label}
              </MenuItem>
            ))}
          </MenuPanel>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Bell with an inline preview of the five most recent notifications. */
function NotificationBell({ unreadCount }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const ref = useDismiss(() => setOpen(false));

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setLoading(true);
    setError('');
    try {
      const res = await adminService.getNotifications({ page: 1, limit: 5 });
      const live = Array.isArray(res.data) ? res.data : [];
      setItems(live);
    } catch (err) {
      setError(err?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={ref} className={POPOVER_ROOT}>
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`${HEADER_ICON_BTN} relative text-ink hover:bg-[#E6F4FA] hover:text-accent-600`}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        <AppIcon icon={Bell} />
        <CountBadge count={unreadCount} tone="brand" className="absolute right-1 -top-0.5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Recent notifications"
            className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-sky-100/80 bg-white p-0 shadow-[0_10px_25px_-5px_rgba(0,163,255,0.1),0_8px_10px_-6px_rgba(0,0,0,0.04)]"
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          >
          <div className="flex items-center justify-between gap-3 border-b border-hairline bg-surface-subtle px-4 py-2.5">
            <p className="text-label font-semibold text-ink">Notifications</p>
            <button
              type="button"
              className="text-label font-semibold text-accent-600 transition-colors hover:text-accent-700"
              onClick={() => {
                setOpen(false);
                navigate('/notifications');
              }}
            >
              View all
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto overscroll-contain p-2" aria-busy={loading} data-lenis-prevent>
            {/* Skeleton mirrors the dot + two-line entry below, so nothing shifts on load. */}
            {loading && <SkeletonFeed count={3} className="px-1 py-1.5" />}
            {!loading && error && (
              <p role="alert" className="rounded-xl bg-danger-surface px-3 py-2.5 text-sm font-medium text-danger-ink">
                {error}
              </p>
            )}
            {!loading && !error && items.length === 0 && (
              <EmptyStateBody
                size="sm"
                icon={BellOff}
                title="You're all caught up"
                description="New approvals, tickets and attendance alerts will land here."
                className="px-4 py-6"
              />
            )}
            {!loading &&
              !error &&
              items.map((item) => {
                const kind = notificationKindMeta(item.type);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate('/notifications');
                    }}
                    className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-fast hover:bg-accent-50"
                  >
                    <span className={`type-icon ${item.read ? '' : 'is-unread'}`} aria-hidden>
                      <AppIcon icon={kind.Icon} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">{item.title || 'Notification'}</span>
                      <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-ink-muted">
                        {item.body || 'Open the notification centre for details.'}
                      </span>
                    </span>
                  </button>
                );
              })}
          </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Unified application header: breadcrumb or page lead, screen actions, then
 * global create and notifications.
 */
export function TopBar({ pathname, canSee, unreadCount = 0, onOpenMobileNav }) {
  const meta = routeMeta(pathname);
  const chrome = usePageChrome();
  const showNotifications = canSee({ to: '/notifications', feature: 'notifications' });

  return (
    <header className="sticky top-0 z-20 flex min-h-12 shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-slate-100 bg-white px-4 py-1.5 md:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className={`${HEADER_ICON_BTN} -ml-1 md:hidden`}
        aria-label="Open navigation menu"
      >
        <AppIcon icon={Menu} />
      </button>

      {chrome?.lead ? (
        <h1 className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-tight text-slate-900 sm:text-base">
          {chrome.lead}
        </h1>
      ) : (
        <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
          <ol className="flex min-w-0 items-center gap-1.5">
            {meta.section && (
              <>
                <li className="hidden shrink-0 text-xs font-medium text-[#8898AA] sm:block">{meta.section}</li>
                <li className="hidden shrink-0 text-xs text-[#8898AA] sm:block" aria-hidden>
                  /
                </li>
              </>
            )}
            <li className="min-w-0 truncate text-[15px] font-semibold leading-none text-slate-900 sm:text-base" aria-current="page">
              {meta.label}
            </li>
          </ol>
        </nav>
      )}

      <div className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1.5">
        <div
          ref={chrome?.setActionsNode}
          className="topbar-page-actions flex min-w-0 flex-wrap items-center justify-end gap-1.5"
        />
        <QuickActions canSee={canSee} />

        {showNotifications && (
          <div className="flex h-full items-center pl-0.5">
            <NotificationBell unreadCount={unreadCount} />
          </div>
        )}
      </div>
    </header>
  );
}
