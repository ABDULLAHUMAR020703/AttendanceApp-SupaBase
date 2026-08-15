import { NavLink } from 'react-router-dom';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { LogOut } from 'lucide-react';
import { NAV_FOOTER_ITEMS, NAV_SECTIONS, NOTIFICATIONS_ITEM } from './navConfig';
import { CountBadge } from './ui/CountBadge';

const ICON_SIZE = 'h-[18px] w-[18px]';
const ICON_STROKE = 1.75;

const ROW_BASE =
  'nav-row group/row relative flex h-10 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-[13px] font-medium tracking-[-0.01em] transition-[background-color,color,opacity] duration-150 ease-out';
const ROW_ACTIVE = 'z-10 mx-2.5 text-[#00B0FF]';
const ROW_IDLE =
  'mx-2.5 text-white/78 hover:bg-white/[0.12] hover:text-white';

const PILL_TRANSITION = { type: 'tween', duration: 0.18, ease: [0.22, 1, 0.36, 1] };

function NavIcon({ icon: Icon, active }) {
  return (
    <Icon
      className={`${ICON_SIZE} shrink-0 transition-colors duration-150 ${
        active ? 'text-[#00B0FF]' : 'text-white/90 group-hover/row:text-white'
      }`}
      strokeWidth={ICON_STROKE}
      aria-hidden
    />
  );
}

function NavRow({ item, badge = 0 }) {
  const reduceMotion = useReducedMotion();

  return (
    <NavLink
      to={item.to}
      title={item.label}
      className={({ isActive }) => `${ROW_BASE} ${isActive ? ROW_ACTIVE : ROW_IDLE}`}
    >
      {({ isActive }) => (
        <>
          {isActive &&
            (reduceMotion ? (
              <span className="nav-item-active pointer-events-none absolute inset-0" />
            ) : (
              <motion.span
                layoutId="activeTabPill"
                className="nav-item-active pointer-events-none absolute inset-0"
                transition={PILL_TRANSITION}
              />
            ))}
          <span className="relative z-20 grid h-[18px] w-[18px] shrink-0 place-items-center">
            <NavIcon icon={item.icon} active={isActive} />
          </span>
          <span className="relative z-20 min-w-0 flex-1 truncate whitespace-nowrap">{item.label}</span>
          {badge > 0 && (
            <CountBadge
              count={badge}
              max={99}
              tone={isActive ? 'brand' : 'onBrand'}
              ring={false}
              className="relative z-20 h-4 min-w-4 shrink-0 text-[10px] font-semibold"
            />
          )}
        </>
      )}
    </NavLink>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="flex h-5 items-center px-5 pt-0.5">
      <p className="nav-section-label truncate whitespace-nowrap">{children}</p>
    </div>
  );
}

/**
 * @param {{
 *   canSee: (item: object) => boolean,
 *   onLogout: () => void,
 *   unreadCount?: number,
 *   className?: string,
 *   layoutGroupId?: string,
 * }} props
 */
export function Sidebar({ canSee, onLogout, unreadCount = 0, className = '', layoutGroupId = 'admin-sidebar' }) {
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(canSee),
  })).filter((section) => section.items.length > 0);

  const showNotifications = canSee(NOTIFICATIONS_ITEM);
  const footerItems = NAV_FOOTER_ITEMS.filter(canSee);

  return (
    <LayoutGroup id={layoutGroupId}>
      <aside
        className={`nav-surface relative z-40 m-0 h-full w-64 shrink-0 flex-col justify-between overflow-hidden p-0 ${className || 'hidden md:flex'}`}
        aria-label="Sidebar"
      >
        <div className="relative flex h-[3.75rem] shrink-0 items-center gap-3 px-4">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-white/95 shadow-[0_1px_4px_rgba(15,23,42,0.12)]">
            <img src="/logo.jpeg" alt="Hadir.ai logo" className="h-5 w-5 rounded-[7px] object-cover" />
          </span>
          <span className="min-w-0">
            <span className="block truncate whitespace-nowrap text-[14px] font-semibold tracking-[-0.02em] text-white">
              Hadir.ai
            </span>
            <span className="block truncate whitespace-nowrap text-[11px] font-medium text-white/55">
              Admin console
            </span>
          </span>
        </div>

        <nav
          className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-0 pb-6 pt-1"
          aria-label="Main navigation"
        >
          {sections.map((section, index) => (
            <div key={section.id} className={index === 0 ? 'space-y-0.5' : 'nav-section mt-6 space-y-0.5'}>
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

        <div className="relative z-20 shrink-0 pb-3 pt-1">
          <div className="nav-footer-rule mx-5 mb-2.5" aria-hidden />
          <div className="space-y-0.5">
            {footerItems.map((item) => (
              <NavRow key={item.to} item={item} />
            ))}
            <button
              type="button"
              onClick={onLogout}
              title="Logout"
              className={`${ROW_BASE} ${ROW_IDLE}`}
            >
              <LogOut className={`${ICON_SIZE} shrink-0 text-white/90`} strokeWidth={ICON_STROKE} aria-hidden />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </LayoutGroup>
  );
}
