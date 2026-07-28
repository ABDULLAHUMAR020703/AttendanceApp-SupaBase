import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store/authStore';
import { canAccessFeature, isSuperAdmin, PERMISSIONS } from '../../features/admin/permissions';
import { useNotificationStore } from '../../features/notifications/store/notificationStore';
import { useSilentPoll } from '../hooks/useSilentPoll';
import { PermissionGate } from './PermissionGate';

const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 13h8V3H3v10Zm0 8h8v-4H3v4Zm10 0h8V11h-8v10Zm0-18v4h8V3h-8Z" />
      </svg>
    ),
  },
  {
    to: '/users',
    label: 'Users',
    feature: 'users',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: '/departments',
    label: 'Departments',
    feature: 'departments',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 21h18" />
        <path d="M5 21V7l7-4 7 4v14" />
        <path d="M9 11h6M9 15h6" />
      </svg>
    ),
  },
  {
    to: '/analytics',
    label: 'Analytics',
    feature: 'analytics',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-4 4" />
      </svg>
    ),
  },
  {
    to: '/attendance',
    label: 'Attendance',
    feature: 'attendance',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M8 2v4M16 2v4M3 10h18" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="m8 15 2 2 5-5" />
      </svg>
    ),
  },
  {
    to: '/work-mode-requests',
    label: 'Work Mode',
    feature: 'workModeRequests',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 12h18M12 3v18" />
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    to: '/leaves',
    label: 'Leaves',
    feature: 'leaves',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M9 15h6M9 11h2" />
      </svg>
    ),
  },
  {
    to: '/tickets',
    label: 'Tickets',
    feature: 'tickets',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 5h16v14H4z" />
        <path d="M8 9h8M8 13h5" />
      </svg>
    ),
  },
  {
    to: '/sites',
    label: 'Geofencing',
    feature: 'sites',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z" />
        <circle cx="12" cy="10" r="2.5" />
      </svg>
    ),
  },
  {
    to: '/calendar',
    label: 'Calendar',
    feature: 'calendar',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M8 2v4M16 2v4M3 10h18" />
        <rect x="3" y="4" width="18" height="18" rx="2" />
      </svg>
    ),
  },
  {
    to: '/reports',
    label: 'Reports',
    feature: 'reports',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    to: '/notifications',
    label: 'Notifications',
    feature: 'notifications',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
        <path d="M9 17a3 3 0 0 0 6 0" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    feature: 'settings',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
  },
  {
    to: '/approval-workflows',
    label: 'Approvals',
    superAdminOnly: true,
    feature: 'approvalWorkflows',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 6h16M4 12h10M4 18h16" />
        <circle cx="18" cy="12" r="2" />
      </svg>
    ),
  },
  {
    to: '/manager-permissions',
    label: 'Permissions',
    superAdminOnly: true,
    feature: 'permissions',
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" />
        <path d="m9 12 2 2 4-5" />
      </svg>
    ),
  },
];

export function AppShell() {
  const { user, logout, refreshPermissions } = useAuthStore();
  const { unreadCount, refresh: refreshBadge } = useNotificationStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return undefined;
    refreshBadge();
    const onFocus = () => {
      refreshPermissions();
      refreshBadge();
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [user?.uid, refreshPermissions, refreshBadge]);

  useSilentPoll(() => refreshBadge(), 30000, [user?.uid]);

  const items = useMemo(() => {
    return navItems.filter((item) => {
      if (item.superAdminOnly && !isSuperAdmin(user)) return false;
      if (item.feature && !canAccessFeature(user, item.feature)) return false;
      return true;
    });
  }, [user]);

  const pageTitle = useMemo(() => {
    const matched = items.find((i) => i.to === location.pathname);
    return matched?.label || 'Dashboard';
  }, [items, location.pathname]);

  const mobileNavItems = useMemo(() => {
    const primary = ['/dashboard', '/attendance', '/leaves', '/notifications'];
    return items.filter((item) => primary.includes(item.to));
  }, [items]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const initials = (user?.name || user?.username || 'A')
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');

  return (
    <div className="relative flex min-h-screen overflow-hidden text-slate-100">
      <div className="absolute inset-0 bg-[#0D0F12]" />
      <div className="absolute -left-40 -top-24 h-[28rem] w-[28rem] rounded-full bg-[#014871]/25 blur-3xl animate-float-slow" />
      <div className="absolute -right-32 bottom-0 h-[26rem] w-[26rem] rounded-full bg-[#A0EBCF]/15 blur-3xl animate-float-slower" />

      <aside className={`relative m-4 hidden flex-col rounded-2xl border border-[#2A2E35] bg-[#1A1D21]/90 backdrop-blur-xl transition-all duration-300 md:flex ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="flex h-16 items-center justify-between border-b border-[#2A2E35] px-4">
          {!isCollapsed && <p className="font-semibold tracking-tight text-white">Hadir.ai Admin</p>}
          <button
            type="button"
            className="rounded-md border border-[#2A2E35] p-1.5 text-slate-200 hover:bg-white/[0.06]"
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-label="Toggle sidebar"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
        </div>

        <div className="space-y-1.5 p-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                isActive
                  ? 'border border-[#A0EBCF]/30 bg-[#014871]/35 text-white shadow-[0_0_0_1px_rgba(160,235,207,0.12),0_8px_20px_rgba(1,72,113,0.3)]'
                  : 'border border-transparent text-slate-300 hover:bg-white/[0.05]'
              }`}
            >
              {({ isActive }) => (
                <>
                  <span className={`relative ${isActive ? 'text-[#A0EBCF]' : 'text-slate-400'}`}>
                    {item.icon}
                    {item.to === '/notifications' && unreadCount > 0 && (
                      <span className="absolute -right-1.5 -top-1.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </span>
                  {!isCollapsed && <span className="flex-1">{item.label}</span>}
                  {!isCollapsed && item.to === '/notifications' && unreadCount > 0 && (
                    <span className="rounded-full bg-red-500/80 px-1.5 py-0.5 text-xs text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </div>

        <div className="mt-auto p-3">
          <button onClick={logout} className="w-full rounded-lg border border-[#2A2E35] bg-white/[0.03] px-3 py-2 text-sm text-slate-200 transition-all duration-200 hover:bg-white/[0.07]">
            {isCollapsed ? '↩' : 'Logout'}
          </button>
        </div>
      </aside>

      <div className="relative min-w-0 flex-1 p-2 md:p-4 md:pl-0">
        <header className="flex h-14 items-center gap-3 rounded-card border border-[#2A2E35] bg-[#1A1D21]/90 px-3 backdrop-blur-xl md:h-16 md:gap-4 md:px-6">
          <button
            type="button"
            className="rounded-input border border-[#2A2E35] p-2 text-slate-100 md:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open navigation menu"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <p className="min-w-fit truncate text-sm font-semibold text-slate-100 md:text-base">{pageTitle}</p>

          <div className="hidden max-w-xl flex-1 sm:block">
            <div className="relative">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users, roles..."
                className="ui-input py-2 pl-9"
              />
              <svg viewBox="0 0 24 24" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </div>
          </div>

          <PermissionGate permission={PERMISSIONS.MANAGE_NOTIFICATIONS}>
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              className="relative rounded-lg border border-[#2A2E35] bg-white/[0.03] p-2 text-slate-100 transition-all duration-200 hover:bg-white/[0.08]"
              aria-label="Notifications"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" />
                <path d="M9 17a3 3 0 0 0 6 0" />
              </svg>
              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-[1rem] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </PermissionGate>

          <div className="relative">
            <button
              className="flex items-center gap-2 rounded-lg border border-[#2A2E35] bg-white/[0.03] px-2 py-1.5 transition-all duration-200 hover:bg-white/[0.08]"
              onClick={() => setShowProfile((prev) => !prev)}
            >
              <span
                className="grid h-8 w-8 place-items-center rounded-full text-xs font-semibold text-white"
                style={{ background: 'linear-gradient(145deg, #014871, #A0EBCF)' }}
              >
                {initials}
              </span>
              <span className="hidden text-sm text-slate-100 md:block">{user?.name || user?.username || 'Admin'}</span>
            </button>

            {showProfile && (
              <div className="absolute right-0 top-11 z-20 w-52 rounded-lg border border-[#2A2E35] bg-[#1A1D21]/95 p-2 shadow-lg backdrop-blur-xl">
                <p className="px-2 py-1 text-xs text-slate-400">Signed in as {user?.role}</p>
                <button onClick={logout} className="mt-1 w-full rounded-md px-2 py-2 text-left text-sm text-slate-100 hover:bg-white/[0.06]">
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="p-3 pb-24 md:p-6 md:pb-6">
          <Outlet context={{ globalSearch: search }} />
        </main>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#2A2E35] bg-[#0D0F12]/90 px-2 pb-safe backdrop-blur-xl md:hidden">
          <div className="flex items-stretch justify-around">
            {mobileNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] ${isActive ? 'text-brand-200' : 'text-slate-500'}`}
              >
                <span className="relative">{item.icon}</span>
                <span>{item.label}</span>
                {item.to === '/notifications' && unreadCount > 0 && (
                  <span className="absolute right-[calc(50%-1.25rem)] top-1 grid h-3.5 min-w-[0.9rem] place-items-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] text-slate-500"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6h16M4 12h10M4 18h16" /></svg>
              <span>More</span>
            </button>
          </div>
        </nav>

        <div className={`fixed inset-0 z-40 md:hidden ${mobileNavOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
          <div className={`absolute inset-0 bg-black/60 transition-opacity ${mobileNavOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setMobileNavOpen(false)} />
          <aside className={`absolute left-0 top-0 h-full w-[min(20rem,85vw)] border-r border-[#2A2E35] bg-[#1A1D21]/98 backdrop-blur-2xl transition-transform ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex h-14 items-center justify-between border-b border-[#2A2E35] px-4">
              <p className="font-semibold text-white">Hadir.ai</p>
              <button type="button" onClick={() => setMobileNavOpen(false)} className="p-2 text-slate-400" aria-label="Close menu">✕</button>
            </div>
            <div className="max-h-[calc(100%-3.5rem)] space-y-1 overflow-y-auto p-3">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${isActive ? 'bg-[#014871]/35 text-white' : 'text-slate-300'}`}
                >
                  {item.icon}
                  {item.label}
                </NavLink>
              ))}
              <button onClick={logout} className="mt-4 w-full rounded-input border border-[#2A2E35] px-3 py-2.5 text-sm text-slate-200">Logout</button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
