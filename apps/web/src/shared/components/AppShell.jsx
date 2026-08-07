import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '../../features/auth/store/authStore';
import { canAccessFeature, isSuperAdmin } from '../../features/admin/permissions';
import { useNotificationStore } from '../../features/notifications/store/notificationStore';
import { useSilentPoll } from '../hooks/useSilentPoll';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { ALL_NAV_ITEMS } from './navConfig';
import { CountBadge } from './ui/CountBadge';

export function AppShell() {
  const { user, logout, refreshPermissions } = useAuthStore();
  const { unreadCount, refresh: refreshBadge } = useNotificationStore();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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

  const canSee = useMemo(() => {
    return (item) => {
      if (item.superAdminOnly && !isSuperAdmin(user)) return false;
      if (item.feature && !canAccessFeature(user, item.feature)) return false;
      return true;
    };
  }, [user]);

  const items = useMemo(() => ALL_NAV_ITEMS.filter(canSee), [canSee]);

  const mobileNavItems = useMemo(() => {
    const primary = ['/dashboard', '/attendance', '/leaves', '/notifications'];
    return items.filter((item) => primary.includes(item.to));
  }, [items]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    /*
      Soft landing canvas (.page-wash) behind the whole admin shell — same ice-teal
      wash as the marketing hero, held still for readable data surfaces.
    */
    <div className="app-admin-surface page-wash m-0 flex h-screen w-screen overflow-hidden p-0 text-ink">
      <Sidebar canSee={canSee} onLogout={logout} unreadCount={unreadCount} />

      <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-transparent">
        <TopBar
          pathname={location.pathname}
          items={items}
          canSee={canSee}
          unreadCount={unreadCount}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <main className="admin-main h-full min-h-0 flex-1 overflow-y-auto bg-transparent px-4 pb-24 pt-4 text-ink md:px-8 md:pb-8 md:pt-6">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-hairline bg-white/92 px-2 pb-safe backdrop-blur-2xl md:hidden">
        <div className="flex items-stretch justify-around">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-micro font-medium transition-colors duration-fast ease-premium ${isActive ? 'text-accent-800' : 'text-ink-muted'}`}
              >
                {({ isActive }) => (
                  <>
                    <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2 : 1.75} />
                    <span>{item.label}</span>
                    {item.to === '/notifications' && (
                      <CountBadge
                        count={unreadCount}
                        className="absolute right-[calc(50%-1.15rem)] top-0.5"
                      />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-micro font-medium text-ink-muted"
          >
            <Menu className="h-[18px] w-[18px]" />
            <span>More</span>
          </button>
        </div>
      </nav>

      <div className={`fixed inset-0 z-30 md:hidden ${mobileNavOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-slate-950/30 backdrop-blur-sm transition-opacity ${mobileNavOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileNavOpen(false)}
        />
        <aside className={`absolute left-0 top-0 flex h-full max-h-dvh w-[min(20rem,85vw)] flex-col overflow-hidden rounded-none bg-[#0097A7] shadow-overlay transition-transform duration-slow ease-premium ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex h-16 shrink-0 items-center justify-between px-4">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-[13px] bg-white shadow-[0_2px_8px_rgba(0,70,79,0.22)]">
                <img src="/logo.jpeg" alt="Hadir.ai logo" className="h-6 w-6 rounded-[9px] object-cover" />
              </span>
              <span>
                <p className="text-[15px] font-bold leading-tight tracking-[-0.02em] text-white">Hadir.ai</p>
                <p className="text-[11px] font-medium leading-tight text-white/75">Admin console</p>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-[10px] text-white transition-[background-color,transform] duration-fast ease-premium hover:bg-white/15 active:scale-95"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain py-3 pb-8 pl-3">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `group/row relative flex items-center gap-3 rounded-l-full px-3 py-2.5 text-left text-[15px] font-medium tracking-[-0.01em] transition-colors duration-200 ease-premium ${isActive ? 'page-wash font-semibold text-accent-900' : 'font-semibold text-white hover:bg-white/20'}`}
                >
                  {({ isActive }) => (
                    <>
                      <Icon
                        className={`h-[20px] w-[20px] shrink-0 transition-colors duration-200 ease-premium ${isActive ? 'text-accent-700' : 'text-white'}`}
                        strokeWidth={isActive ? 2 : 1.75}
                      />
                      {item.label}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>

          <div className="relative z-20 shrink-0 bg-[#0097A7] py-3 pl-3">
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-[15px] font-semibold text-white transition-all hover:bg-white/10"
            >
              <LogOut className="h-5 w-5 shrink-0 text-white" strokeWidth={1.75} />
              <span>Logout</span>
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
