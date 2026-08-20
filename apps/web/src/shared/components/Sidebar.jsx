import { NavLink } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { NAV_FOOTER_ITEMS, NAV_SECTIONS, NOTIFICATIONS_ITEM } from './navConfig';
import { CountBadge } from './ui/CountBadge';

/*
 * Cyan rail with concave active cutout (white pill → main canvas).
 * Palette: #00B2EE / white / soft sky — layout from the reference.
 */
const ROW_BASE =
  'group/row relative flex h-11 w-full items-center gap-3 pl-3.5 pr-4 text-left text-label tracking-[-0.01em] transition-colors duration-200 ease-premium';
const ROW_ACTIVE =
  'nav-item-active z-10 ml-3 mr-0 rounded-l-[20px] bg-white font-semibold text-[#00B2EE]';
const ROW_IDLE =
  'mx-3 rounded-xl font-semibold text-white/85 hover:bg-white/15 hover:text-white';

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
          <span className="relative grid h-5 w-5 shrink-0 place-items-center">
            <Icon
              className={`h-[18px] w-[18px] transition-colors duration-200 ease-premium ${
                isActive ? 'text-[#00B2EE]' : 'text-white/85 group-hover/row:text-white'
              }`}
              strokeWidth={isActive ? 2 : 1.75}
            />
          </span>
          <span className="min-w-0 flex-1 truncate whitespace-nowrap">{item.label}</span>
          {badge > 0 && (
            <CountBadge
              count={badge}
              max={99}
              tone={isActive ? 'brand' : 'onBrand'}
              ring={false}
              className="h-[1.125rem] shrink-0"
            />
          )}
        </>
      )}
    </NavLink>
  );
}

function SectionLabel({ children }) {
  return (
    <div className="relative flex h-6 items-center px-6">
      <p className="truncate whitespace-nowrap text-micro font-bold uppercase tracking-[0.12em] text-white/65">
        {children}
      </p>
    </div>
  );
}

/**
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
      className="nav-surface relative z-40 m-0 hidden h-full w-64 shrink-0 flex-col justify-start overflow-y-auto rounded-l-3xl p-0 md:flex"
      aria-label="Sidebar"
    >
      <div className="relative flex h-16 shrink-0 items-center gap-3 px-5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[13px] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.14)]">
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
        className="relative flex-none space-y-1 py-4 pb-1"
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

      <div className="relative z-20 mt-2 shrink-0 space-y-1 border-t border-white/20 bg-transparent py-3">
        {footerItems.map((item) => (
          <NavRow key={item.to} item={item} />
        ))}

        <button
          type="button"
          onClick={onLogout}
          title="Logout"
          className={`${ROW_BASE} ${ROW_IDLE} w-auto`}
        >
          <LogOut className="h-5 w-5 shrink-0 text-white/85" strokeWidth={1.75} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
