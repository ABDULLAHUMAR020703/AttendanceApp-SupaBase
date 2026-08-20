/**
 * One Lucide outline family for the admin portal.
 * Nav and notification rows sit at 18px with a 1.75px visual stroke; denser
 * glyphs are scaled a hair down so they don't read heavier than simpler ones.
 */
export const ICON_SIZE_PX = 18;
export const ICON_STROKE = 1.75;

const OPTICAL_SCALE = {
  LayoutGrid: 0.94,
  Building2: 0.94,
  CalendarCheck2: 0.92,
  CalendarDays: 0.92,
  CalendarClock: 0.9,
  CalendarOff: 0.9,
  ListChecks: 0.9,
  ClipboardCheck: 0.92,
  Ticket: 0.92,
  Settings2: 0.94,
  Laptop2: 0.94,
  ShieldCheck: 0.94,
  BarChart3: 0.94,
  FileBarChart: 0.9,
  UsersRound: 0.96,
  Bell: 1.02,
  MapPin: 1.04,
  LogOut: 1,
  Info: 1,
};

export function AppIcon({
  icon: Icon,
  size = ICON_SIZE_PX,
  className = '',
  strokeWidth = ICON_STROKE,
  style,
  ...props
}) {
  if (!Icon) return null;
  const scale = OPTICAL_SCALE[Icon.displayName] ?? 1;

  return (
    <Icon
      {...props}
      size={size}
      strokeWidth={strokeWidth}
      absoluteStrokeWidth
      aria-hidden
      className={`shrink-0 ${className}`.trim()}
      style={{ ...(scale !== 1 ? { transform: `scale(${scale})` } : {}), ...style }}
    />
  );
}
