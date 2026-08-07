import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { NAV_FOOTER_ITEMS, NAV_SECTIONS, NOTIFICATIONS_ITEM } from './navConfig';
import { CountBadge } from './ui/CountBadge';

/*
 * Row geometry for a permanently expanded 256px rail. Left padding only — the
 * selected tab must reach the rail's right edge so its inverse curves meet the
 * page canvas. Icons and labels share one baseline via items-center + gap-3.
 */
const ROW_BASE =
  'group/row relative flex h-9 w-full items-center gap-3 rounded-l-full pl-2.5 pr-3 text-left text-label tracking-[-0.01em] transition-colors duration-200 ease-premium';
/*
 * Active tab + curve pieces share .page-wash with the dashboard canvas so the
 * cutout merges into the landing-matched background with no shade seam.
 */
const ROW_ACTIVE = 'page-wash z-10 font-semibold text-accent-900';
const ROW_IDLE = 'font-semibold text-white hover:bg-white/20';
const CUTOUT = 'nav-cut page-wash';

function NavRow({ item, badge = 0 }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      title={item.label}
      className={({ isActive }) => `${ROW_BASE} ${isActive ? ROW_ACTIVE : ROW_IDLE}`}
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <>
              <b className={`${CUTOUT} nav-cut-top`} aria-hidden />
              <b className={`${CUTOUT} nav-cut-bottom`} aria-hidden />
            </>
          )}
          <span className="relative grid h-5 w-5 shrink-0 place-items-center">
            <Icon
              className={`h-[18px] w-[18px] transition-colors duration-200 ease-premium ${
                isActive ? 'text-accent-700' : 'text-white'
              }`}
              strokeWidth={isActive ? 2 : 1.75}
            />
          </span>
          <span className="min-w-0 flex-1 truncate whitespace-nowrap">{item.label}</span>
          {badge > 0 && (
            <CountBadge
              count={badge}
              max={99}
              ring={false}
              className={
                isActive
                  ? 'shrink-0 h-[1.125rem] ring-2 ring-white'
                  : 'shrink-0 h-[1.125rem] ring-2 ring-[#0097A7]'
              }
            />
          )}
        </>
      )}
    </NavLink>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="relative flex h-6 items-center pl-2.5 pr-3">
      <p className="truncate whitespace-nowrap text-micro font-bold uppercase tracking-[0.12em] text-white">
        {children}
      </p>
    </div>
  );
}

/**
 * In-flow left rail: flush to the viewport edge (no outer margin/padding/radius),
 * square corners, 256px wide. Lives in the AppShell flex row so the content column
 * sits beside it — no fixed positioning, no pl-64 offset.
 *
 * @param {{
 *   canSee: (item: object) => boolean,
 *   onLogout: () => void,
 *   unreadCount?: number,
 * }} props
 */
export function Sidebar({ canSee, onLogout, unreadCount = 0 }) {
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(canSee),
  })).filter((section) => section.items.length > 0);

  const showNotifications = canSee(NOTIFICATIONS_ITEM);
  const footerItems = NAV_FOOTER_ITEMS.filter(canSee);

  return (
    <aside
      className="relative z-40 m-0 hidden h-full w-64 shrink-0 flex-col justify-between overflow-hidden rounded-none bg-[#0097A7] p-0 text-white md:flex"
      style={{ '--nav-rail': '#0097A7' }}
      aria-label="Sidebar"
    >
      <div className="relative flex h-14 shrink-0 items-center gap-3 px-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-white shadow-[0_2px_8px_rgba(0,70,79,0.22)]">
          <img src="/logo.jpeg" alt="Hadir.ai logo" className="h-6 w-6 rounded-[9px] object-cover" />
        </span>
        <span className="min-w-0">
          <span className="block truncate whitespace-nowrap text-subheading font-bold tracking-[-0.02em] text-white">
            Hadir.ai
          </span>
          <span className="block truncate whitespace-nowrap text-micro font-medium text-white/75">
            Admin console
          </span>
        </span>
      </div>

      <nav
        className="no-scrollbar relative min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain py-6 pb-8 pl-4"
        aria-label="Main navigation"
      >
        {sections.map((section, index) => (
          <div key={section.id} className={index === 0 ? 'space-y-1' : 'mt-4 space-y-1'}>
            {section.label && <SectionLabel>{section.label}</SectionLabel>}
            {section.items.map((item) => (
              <NavRow key={item.to} item={item} />
            ))}
            {index === 0 && showNotifications && (
              <NavRow item={NOTIFICATIONS_ITEM} badge={unreadCount} />
            )}
          </div>
        ))}
      </nav>

      <div className="relative z-20 shrink-0 space-y-1 bg-[#0097A7] py-3 pl-4">
        {footerItems.map((item) => (
          <NavRow key={item.to} item={item} />
        ))}

        <button
          type="button"
          onClick={onLogout}
          title="Logout"
          className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-semibold text-white transition-all hover:bg-white/10"
        >
          <LogOut className="h-5 w-5 shrink-0 text-white" strokeWidth={1.75} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
