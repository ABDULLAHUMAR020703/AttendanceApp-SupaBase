import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellOff,
  Building2,
  CalendarDays,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Ticket,
  UserPlus,
} from 'lucide-react';
import { adminService } from '../../features/admin/services/adminService';
import { useAuthStore } from '../../features/auth/store/authStore';
import { useDismiss } from '../lib/useDismiss';
import { NAV_SECTIONS } from './navConfig';
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
  '/notifications': { section: null, label: 'Notifications' },
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

/** Jump-to-screen search: filters the screens this user can actually reach. */
function ScreenSearch({ items }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);
  const ref = useDismiss(() => setOpen(false));

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return items.filter((item) => item.label.toLowerCase().includes(term)).slice(0, 6);
  }, [items, query]);

  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const go = (item) => {
    if (!item) return;
    navigate(item.to);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  return (
    <div ref={ref} className={`${POPOVER_ROOT} hidden lg:flex`}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 h-[15px] w-[15px] -translate-y-1/2 text-[#00BCFF]"
        aria-hidden
      />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-controls="screen-search-results"
        value={query}
        placeholder="Search screens"
        onChange={(event) => {
          setQuery(event.target.value);
          setCursor(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setCursor((index) => Math.min(index + 1, matches.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setCursor((index) => Math.max(index - 1, 0));
          } else if (event.key === 'Enter') {
            go(matches[cursor]);
          }
        }}
        className="ui-input h-8 min-h-0 w-52 rounded-lg border-[#D0ECF9] bg-white py-0 pl-8 pr-10 text-label transition-all duration-200 hover:border-[#70C9EF] hover:bg-[#F0F8FF] focus:w-64 focus:border-[#00BCFF] focus:bg-white"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-[#D0ECF9] bg-[#E6F4FA] px-1.5 py-px text-micro font-semibold text-[#00BCFF] xl:block">
        ⌘K
      </kbd>

      {open && query.trim() !== '' && (
        <div id="screen-search-results" role="listbox" className={`${PANEL} w-72`}>
          {matches.length === 0 ? (
            <p className="px-2.5 py-3 text-label text-ink-muted">
              No screen matches “<span className="font-semibold text-ink">{query.trim()}</span>”.
            </p>
          ) : (
            matches.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.to}
                  type="button"
                  role="option"
                  aria-selected={index === cursor}
                  onMouseEnter={() => setCursor(index)}
                  onClick={() => go(item)}
                  className={`ui-menu-item ${index === cursor ? 'ui-menu-item-active' : ''}`}
                >
                  <Icon className="shrink-0 text-[#00BCFF]" aria-hidden />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

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
      setItems(res.data || []);
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
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.9} aria-hidden />
        <CountBadge count={unreadCount} tone="brand" className="absolute -right-0.5 -top-0.5" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Recent notifications"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-hairline bg-white p-0 shadow-pop animate-scale-in"
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

          <div className="max-h-80 overflow-y-auto p-2" aria-busy={loading}>
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
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate('/notifications');
                  }}
                  className="flex w-full gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-fast hover:bg-accent-50"
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.read ? 'bg-ink-faint' : 'bg-accent-600'}`}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{item.title || 'Notification'}</span>
                    <span className="mt-0.5 block line-clamp-2 text-xs leading-5 text-ink-muted">
                      {item.body || 'Open the notification centre for details.'}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileMenu({ onLogout, onRefresh }) {
  const user = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(close);
  const label = user?.username || user?.email || 'Admin';
  const initials = String(label)
    .replace(/@.*/, '')
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'A';

  return (
    <div ref={ref} className={POPOVER_ROOT}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="grid h-8 w-8 place-items-center rounded-full bg-[#F0F9FD] text-[11px] font-bold text-[#00B0FF] transition-colors duration-200 hover:bg-[#00B0FF] hover:text-white"
      >
        {initials}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-48 rounded-xl border border-slate-100 bg-white p-2 shadow-xl animate-picker-in"
        >
          <p className="truncate px-2 py-1.5 text-xs font-medium text-[#8898AA]">{label}</p>
          <button
            type="button"
            role="menuitem"
            onClick={async () => {
              await onRefresh?.();
              close();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-[#F0F9FD] hover:text-[#00B0FF]"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
            Refresh
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              onLogout?.();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Compact application header: breadcrumb + page title, then search and account.
 */
export function TopBar({ pathname, items, canSee, unreadCount = 0, onOpenMobileNav, onLogout, onRefresh }) {
  const meta = routeMeta(pathname);
  const showNotifications = canSee({ to: '/notifications', feature: 'notifications' });

  return (
    <header className="z-20 flex h-12 shrink-0 items-center gap-4 border-b border-slate-100 bg-white px-4 py-1 md:px-6">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className={`${HEADER_ICON_BTN} -ml-1 md:hidden`}
        aria-label="Open navigation menu"
      >
        <Menu className="h-[18px] w-[18px]" aria-hidden />
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0">
        <ol className="flex min-w-0 items-center gap-1.5">
          {meta.section && (
            <>
              <li className="hidden shrink-0 text-xs font-medium text-[#8898AA] sm:block">{meta.section}</li>
              <li className="hidden shrink-0 text-xs text-[#8898AA] sm:block" aria-hidden>
                /
              </li>
            </>
          )}
          <li className="min-w-0 truncate text-xl font-bold leading-none text-slate-900" aria-current="page">
            {meta.label}
          </li>
        </ol>
      </nav>

      <div className="ml-auto flex h-full items-center gap-2">
        <ScreenSearch items={items} />
        <QuickActions canSee={canSee} />

        {showNotifications && (
          <div className="flex h-full items-center pl-0.5">
            <NotificationBell unreadCount={unreadCount} />
          </div>
        )}
        <ProfileMenu onLogout={onLogout} onRefresh={onRefresh} />
      </div>
    </header>
  );
}
