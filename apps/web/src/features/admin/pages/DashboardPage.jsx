import { Fragment, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  LogIn,
  LogOut,
  Minus,
  MoreHorizontal,
  PenLine,
  RefreshCw,
  Ticket,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserCog,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { useAuthStore } from '../../auth/store/authStore';
import { canAccessFeature, hasAnyPermission, hasPermission, PERMISSIONS } from '../permissions';
import { buildUserGrowthSeries, normalizeAttendanceType } from '../utils/analyticsCharts';
import { formatEmployeeDisplay, formatLeaveTypeLabel } from '../utils/leaveDisplay';
import { useSilentPoll } from '../../../shared/hooks/useSilentPoll';
import { useDismiss } from '../../../shared/lib/useDismiss';
import { EmptyStateBody } from '../../../shared/components/ui/EmptyState';
import { StatusBadge } from '../../../shared/components/ui/Badge';
import { MenuItem, MenuPanel, useMenuNavigation } from '../../../shared/components/ui/Menu';
import { rankColor } from '../../../shared/components/charts/chartTheme';
import { buildDashboardMock, shouldSeedDashboardMock } from '../utils/dashboardMock';

const AttendanceTrendAreaChart = lazy(() =>
  import('../../../shared/components/charts/AttendanceTrendAreaChart').then((m) => ({
    default: m.AttendanceTrendAreaChart,
  }))
);
const UserGrowthLineChart = lazy(() =>
  import('../../../shared/components/charts/UserGrowthLineChart').then((m) => ({
    default: m.UserGrowthLineChart,
  }))
);
const AttendanceMixPieChart = lazy(() =>
  import('../../../shared/components/charts/AttendanceMixPieChart').then((m) => ({
    default: m.AttendanceMixPieChart,
  }))
);
/*
 * Card system. Radius, border and elevation are identical on every card: a 20px
 * corner, one hairline and a single whisper of shadow. Vercel and Stripe both
 * carry entire dashboards on exactly that, and vary importance through density
 * instead — so nothing here gets a heavier shadow or a thicker border to look
 * more important.
 *
 * What a tier changes is padding, title size, whether a category overline is
 * present, and how much height the body claims. Everything stays on the 8-point
 * scale:
 *
 *   tier      padding  title  header gap  body     reads as
 *   primary   24       20px   20          19rem    what the shift is doing now
 *   secondary 20       16px   16          15rem    analysis you read after acting
 *   utility   16       16px   12          12rem    reference lists and feeds
 */
const CARD = 'ui-card';
const CARD_EYEBROW = 'card-eyebrow';
const CARD_TIERS = {
  primary: {
    shell: `${CARD} flex h-full flex-col p-5 sm:p-6`,
    title: 'text-heading font-semibold tracking-tight text-ink',
    gap: 'mt-5',
    body: 'min-h-[16rem] flex-1',
    footer: 'mt-5 pt-4',
  },
  secondary: {
    shell: `${CARD} flex h-full flex-col p-5`,
    title: 'text-subheading font-semibold tracking-tight text-ink',
    gap: 'mt-4',
    body: 'min-h-[14rem] flex-1',
    footer: 'mt-4 pt-4',
  },
  utility: {
    shell: `${CARD} flex h-full flex-col p-4 sm:p-5`,
    title: 'text-subheading font-semibold tracking-tight text-ink',
    gap: 'mt-4',
    body: 'min-h-[12rem] flex-1',
    footer: 'mt-4 pt-3',
  },
};
const cardFooter = (tier) =>
  `${CARD_TIERS[tier].footer} flex items-center justify-between gap-4 border-t border-hairline text-caption font-medium text-ink-muted`;
const FOCUS_RING =
  'focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[rgba(0,167,214,0.25)] focus-visible:ring-offset-2';
/* Design tokens for this dashboard (Hadir cyan system). */
const CYAN = '#00BCFF';
const SKY = '#70C9EF';
const SOFT_SKY = '#E6F4FA';
const SLATE = '#0F172A';
const MUTED = '#64748B';
const ICE = '#F8FCFD';

/* One button vocabulary for the whole dashboard: filled cyan leads, outline follows. */
const BTN_BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 ease-premium active:translate-y-px';
const BTN_PRIMARY = `${BTN_BASE} bg-[#00B0FF] text-white shadow-[0_1px_3px_rgba(0,176,255,0.28)] hover:-translate-y-px hover:bg-[#0099E6] hover:shadow-[0_6px_16px_rgba(0,153,230,0.3)]`;
const BTN_QUIET = `${BTN_BASE} border border-[#70C9EF]/50 bg-white text-[#64748B] hover:border-[#70C9EF] hover:bg-[#E6F4FA] hover:text-[#00BCFF]`;
const BTN_DANGER_QUIET = `${BTN_BASE} border border-hairline bg-white text-ink-muted hover:border-danger-border hover:bg-danger-surface hover:text-danger-ink`;
const BTN_SM = 'px-2.5 py-1.5 text-caption';
const BTN_SOFT_BASE =
  'inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-caption font-semibold transition-all duration-200 ease-premium active:scale-[0.98] disabled:cursor-not-allowed';
const BTN_SOFT_APPROVE = `${BTN_SOFT_BASE} bg-[#00B0FF] text-white shadow-[0_1px_3px_rgba(0,176,255,0.22)] hover:-translate-y-px hover:bg-[#0099E6] hover:shadow-[0_8px_18px_rgba(0,176,255,0.28)]`;
const BTN_SOFT_DANGER = `${BTN_SOFT_BASE} border border-[#FECACA] bg-white text-[#DC2626] hover:border-[#F87171] hover:bg-[#FEF2F2]`;
const ICON_BTN =
  'grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-hairline bg-white text-ink-muted transition-all duration-200 hover:border-[#70C9EF] hover:bg-[#E6F4FA] hover:text-[#00BCFF]';
const HEALTH_FILTERS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
];
const HEALTH_SEGMENTS = [
  { key: 'onSite', label: 'On-site', color: CYAN, colorSoft: SKY },
  { key: 'remote', label: 'Remote / hybrid', color: SKY, colorSoft: CYAN },
  { key: 'absent', label: 'Not checked in', color: '#E0F6FC', colorSoft: '#C2ECF9' },
];

const WORK_MODE_LABELS = {
  in_office: 'In office',
  semi_remote: 'Semi remote',
  fully_remote: 'Fully remote',
};

const REMOTE_MODES = new Set(['semi_remote', 'fully_remote', 'remote', 'hybrid']);

const ACTIVITY_WINDOW = { from: 6, to: 20 };

const HEATMAP_BAND_HOURS = 2;
const HEATMAP_DAYS = 7;
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/*
 * Heatmap density — ice → soft sky → sky → vivid→deep cyan.
 */
const HEATMAP_LEVELS = [
  {
    gradient: `linear-gradient(135deg, ${ICE}, ${ICE})`,
    border: `1px solid ${SOFT_SKY}`,
    glow: '0 4px 12px rgba(0,188,255, 0.3)',
    pulse: false,
    label: '0',
  },
  {
    gradient: `linear-gradient(135deg, ${SOFT_SKY}, ${SOFT_SKY})`,
    border: '1px solid transparent',
    glow: '0 4px 12px rgba(0,188,255, 0.3)',
    pulse: false,
    label: '1–2',
  },
  {
    gradient: `linear-gradient(135deg, ${SKY}, ${SKY})`,
    border: '1px solid transparent',
    glow: '0 4px 12px rgba(0,188,255, 0.3)',
    pulse: false,
    label: '3–4',
  },
  {
    gradient: `linear-gradient(135deg, ${CYAN}, #0088E8)`,
    border: '1px solid transparent',
    glow: '0 4px 12px rgba(0,188,255, 0.35)',
    pulse: true,
    label: '5+',
  },
];

const heatmapLevelOf = (count) => {
  if (!count || count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 4) return 2;
  return 3;
};

/** 13 → "1pm". Hour labels are 12-hour because the axis is scanned, not computed. */
const formatHourLabel = (hour) => {
  const normalized = ((hour % 24) + 24) % 24;
  const suffix = normalized < 12 ? 'am' : 'pm';
  return `${normalized % 12 === 0 ? 12 : normalized % 12}${suffix}`;
};

const formatNumber = (value) =>
  new Intl.NumberFormat('en', { notation: value > 9999 ? 'compact' : 'standard' }).format(value || 0);

const formatRelativeTime = (isoValue) => {
  if (!isoValue) return 'Unknown time';
  const deltaMs = Date.now() - new Date(isoValue).getTime();
  if (Number.isNaN(deltaMs) || deltaMs < 0) return 'Just now';
  const mins = Math.floor(deltaMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

/** 08:34 — the feed leads with wall-clock time, not a relative age. */
const clockTime = (isoValue) => {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

const dayGroupLabel = (isoValue) => {
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return 'Earlier';
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  if (date >= midnight) return 'Today';
  const yesterday = new Date(midnight);
  yesterday.setDate(midnight.getDate() - 1);
  if (date >= yesterday) return 'Yesterday';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
};

/*
 * Display names arrive as "Ahad (ahad)", so the bracketed username is dropped and
 * punctuation stripped — otherwise the second initial comes out as "(".
 */
const getInitials = (value = 'User') =>
  String(value)
    .replace(/\(.*?\)/g, ' ')
    .split(/[\s._-]+/)
    .map((part) => part.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'U';

const toTitleCaseName = (value = 'User') => {
  const raw = String(value || 'User').replace(/@.*/, '').replace(/[._-]+/g, ' ').trim();
  return (
    raw
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .slice(0, 2)
      .join(' ') || 'User'
  );
};

const attendanceUserKey = (row) =>
  String(row?.user_uid || row?.uid || row?.username || row?.employee_uid || '').toLowerCase();

const userKeys = (user) =>
  [user?.uid, user?.id, user?.username].filter(Boolean).map((value) => String(value).toLowerCase());

const leaveDayCount = (leave) => {
  if (leave?.days) return Number(leave.days);
  if (!leave?.start_date || !leave?.end_date) return null;
  const start = new Date(leave.start_date);
  const end = new Date(leave.end_date);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  return Math.max(1, Math.round((end - start) / 86400000) + 1);
};

/** "Abdul Samad requested a 2-day Sick Leave" */
const leaveRequestSummary = (leave) => {
  const days = leaveDayCount(leave);
  const type = formatLeaveTypeLabel(leave?.leave_type);
  return days ? `Requested a ${days}-day ${type}` : `Requested ${type}`;
};

const shortDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

/** Days until a date, floored at 0. Used to flag requests that start imminently. */
const daysUntil = (value) => {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Eases a metric from its previous value to the next one so refreshed numbers
 * register as a change instead of silently swapping.
 */
function useCountUp(value, duration = 600) {
  const target = Number.isFinite(value) ? value : 0;
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    fromRef.current = target;
    if (from === target || prefersReducedMotion()) {
      setDisplay(target);
      return undefined;
    }
    let frame;
    const started = performance.now();
    const step = (now) => {
      const progress = Math.min(1, (now - started) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return display;
}

/**
 * Movement pill: direction by arrow, magnitude by label, tone by semantic surface.
 *
 * Used by the trend card only. The KPI cards deliberately do not carry one — a chip
 * next to a headline number is a second metric competing with the first.
 */
function DeltaChip({ delta, suffix = '' }) {
  if (delta == null) return null;
  const rising = delta > 0;
  const falling = delta < 0;
  const Icon = rising ? TrendingUp : falling ? TrendingDown : Minus;
  const tone = rising
    ? 'bg-success-surface text-success-ink'
    : falling
      ? 'bg-danger-surface text-danger-ink'
      : 'bg-surface-muted text-ink-muted';

  return (
    <span
      className={`inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full px-2 text-micro font-semibold tabular-nums ${tone}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.5} aria-hidden />
      {delta === 0 ? (
        'Steady'
      ) : (
        <>
          {rising ? '+' : ''}
          {delta}
          {suffix}
        </>
      )}
    </span>
  );
}

/**
 * Reference-style attendance composition: text rows on the left, connector lines,
 * and filled cyan circles cropped from the lower-right edge.
 */
function LayeredAttendanceViz({
  segments,
  headcount,
  covered,
  coverage,
  rangeLabel,
  activeKey,
  onHoverKey,
  reveal,
}) {
  const animatedCoverage = useCountUp(coverage, 820);
  const safeHead = Math.max(headcount, 1);
  const share = (value) => (safeHead ? Math.round((Math.max(0, value) / safeHead) * 100) : 0);
  const attendanceRows = segments.map((segment) => ({
    ...segment,
    pct: share(segment.value),
    note:
      segment.key === 'onSite'
        ? 'Checked in from an approved site'
        : segment.key === 'remote'
          ? 'Working remotely or hybrid today'
          : 'Still waiting on today\'s check-in',
  }));
  const rowOffsets = ['top-[22%]', 'top-[48%]', 'top-[74%]'];
  const lineWidths = ['w-[43%]', 'w-[50%]', 'w-[58%]'];
  const circleOpacity = (key, resting) => (activeKey && activeKey !== key ? resting * 0.58 : resting);
  const circleScale = (key) => (activeKey === key ? 'scale(1.025)' : 'scale(1)');

  return (
    <section
      className="relative min-h-[20rem] overflow-hidden rounded-2xl border border-[#C2ECF9] bg-white/82 shadow-[inset_0_1px_0_rgba(255,255,255,0.78)] sm:min-h-[21rem]"
      role="img"
      aria-label={`${coverage} percent covered. ${attendanceRows
        .map((row) => `${row.label} ${row.value}, ${row.pct} percent`)
        .join('. ')}.`}
      onMouseLeave={() => onHoverKey?.(null)}
    >
      <div className="relative z-20 flex items-center justify-between gap-4 border-b border-[#C2ECF9]/70 px-4 py-3 sm:px-5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">
          Attendance mix
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#00BCFF]">
          {covered}/{headcount} accounted - {rangeLabel}
        </span>
      </div>

      <div className="relative z-10 h-[17rem] sm:h-[18rem]">
        {attendanceRows.map((row, index) => {
          const active = activeKey === row.key;
          const muted = Boolean(activeKey && !active);
          return (
            <button
              key={row.key}
              type="button"
              className={`absolute left-4 z-20 flex w-[58%] -translate-y-1/2 items-start gap-3 text-left transition-[opacity,transform] duration-300 ease-premium sm:left-5 sm:w-[52%] ${rowOffsets[index]} ${FOCUS_RING}`}
              style={{
                opacity: reveal ? (muted ? 0.42 : 1) : 0,
                transform: reveal
                  ? active
                    ? 'translateY(-50%) translateX(3px)'
                    : 'translateY(-50%) translateX(0)'
                  : 'translateY(calc(-50% + 7px))',
                transitionDelay: reveal ? `${index * 80}ms` : '0ms',
              }}
              onMouseEnter={() => onHoverKey?.(row.key)}
              onFocus={() => onHoverKey?.(row.key)}
              onMouseLeave={() => onHoverKey?.(null)}
              onBlur={() => onHoverKey?.(null)}
            >
              <span className="relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#00BCFF] shadow-[0_0_0_4px_rgba(0,188,255,0.1)]" aria-hidden>
                <span
                  className={`absolute left-1/2 top-1/2 h-px -translate-y-1/2 bg-[#70C9EF]/60 transition-all duration-300 ease-premium ${lineWidths[index]}`}
                />
              </span>
              <span className="relative z-10 max-w-[12.5rem] bg-white/86 pr-3 backdrop-blur-[1px]">
                <span className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-[#0F172A]">
                  {row.label}
                </span>
                <span className="mt-1 block text-[13px] font-semibold text-[#0F172A]">
                  {row.value} people <span className="text-[#00BCFF]">{row.pct}%</span>
                </span>
                <span className="mt-1 block text-[11px] font-medium leading-4 text-[#64748B]">
                  {row.note}
                </span>
              </span>
            </button>
          );
        })}

        <div
          className="absolute -bottom-[9.5rem] -right-[10.5rem] z-0 h-[29rem] w-[29rem] rounded-full bg-[#E0F6FC] transition-[opacity,transform] duration-[520ms] ease-premium sm:-bottom-[10rem] sm:-right-[9.75rem]"
          style={{ opacity: circleOpacity('absent', 0.82), transform: circleScale('absent') }}
          aria-hidden
        />
        <div
          className="absolute -bottom-[6.9rem] -right-[6.7rem] z-0 h-[21.5rem] w-[21.5rem] rounded-full bg-[#70C9EF]/58 transition-[opacity,transform] duration-[520ms] ease-premium"
          style={{ opacity: circleOpacity('remote', 0.86), transform: circleScale('remote') }}
          aria-hidden
        />
        <div
          className="absolute -bottom-[4.2rem] -right-[2.9rem] z-0 flex h-[13.5rem] w-[13.5rem] items-start justify-start rounded-full bg-[#00BCFF] pl-10 pt-10 text-white shadow-[0_18px_42px_-30px_rgba(0,144,196,0.7)] transition-[opacity,transform] duration-[520ms] ease-premium sm:pl-11 sm:pt-11"
          style={{ opacity: activeKey && activeKey !== 'onSite' ? 0.82 : 0.96, transform: circleScale('onSite') }}
        >
          <span className="text-center">
            <span className="block text-[2.15rem] font-bold leading-none tabular-nums sm:text-[2.45rem]">
              {animatedCoverage}%
            </span>
            <span className="mt-2 block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/86">
              Covered
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}

/**
 * In-card empty state: the shared body at its compact size, stretched to fill the
 * card so a quiet card never reads as a broken one.
 */
function CardEmpty({ icon, title, description, action }) {
  return (
    <EmptyStateBody
      icon={icon}
      title={title}
      description={description}
      action={action}
      size="sm"
      className="h-full px-4 py-6"
    />
  );
}

/**
 * The one header every card uses: optional overline, title sized by tier, an
 * optional line of supporting numbers, and actions pinned right. Standardising
 * this is what stops six cards from inventing six header layouts.
 */
function CardHeader({ tier = 'secondary', eyebrow, title, meta, action }) {
  const type = CARD_TIERS[tier];
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <span className={`block ${CARD_EYEBROW}`}>{eyebrow}</span>}
        <h2 className={`${type.title} truncate`}>{title}</h2>
        {meta && <p className="mt-1 truncate text-caption font-medium text-ink-muted">{meta}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

function GhostAction({ onClick, children, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-hairline bg-white px-2.5 text-xs font-semibold text-ink-muted transition-all duration-200 hover:border-accent-200 hover:bg-[#E6F4FA] hover:text-accent-600 ${FOCUS_RING}`}
    >
      {children}
    </button>
  );
}

function IconAction({ onClick, label }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={`${ICON_BTN} ${FOCUS_RING}`}>
      <ArrowUpRight className="h-4 w-4" strokeWidth={1.9} aria-hidden />
    </button>
  );
}

/**
 * Command-center header + KPI row — hierarchy, not four equal widgets.
 */
function OverviewBanner({ stats, loading }) {
  return (
    <section className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <div key={stat.label} className="min-h-0 min-w-0 h-full">
          <KpiStat {...stat} hero={index === 0} loading={loading} />
        </div>
      ))}
    </section>
  );
}

function KpiSvg({ className = '', children }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

function KpiIconWorkforce({ className }) {
  return (
    <KpiSvg className={className}>
      <circle cx="12" cy="6.25" r="2.35" />
      <path d="M7.75 15.25c.7-2.35 2.25-3.7 4.25-3.7s3.55 1.35 4.25 3.7" />
      <circle cx="5.35" cy="8.1" r="1.95" />
      <path d="M2.2 15.4c.55-1.9 1.75-3 3.15-3" />
      <circle cx="18.65" cy="8.1" r="1.95" />
      <path d="M21.8 15.4c-.55-1.9-1.75-3-3.15-3" />
    </KpiSvg>
  );
}

function KpiIconCalendar({ className }) {
  return (
    <KpiSvg className={className}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3.5v3" />
      <path d="M16 3.5v3" />
      <path d="M7.5 13h2" />
      <path d="M11 13h2" />
      <path d="M14.5 13h2" />
      <path d="M7.5 16.25h2" />
      <path d="M11 16.25h2" />
    </KpiSvg>
  );
}

function KpiIconWifi({ className }) {
  return (
    <KpiSvg className={className}>
      <path d="M4.2 10.2a11 11 0 0 1 15.6 0" />
      <path d="M7.1 13.1a7 7 0 0 1 9.8 0" />
      <path d="M10 16a3.2 3.2 0 0 1 4 0" />
      <circle cx="12" cy="19" r="1.05" fill="currentColor" stroke="none" />
    </KpiSvg>
  );
}

function KpiIconClock({ className }) {
  return (
    <KpiSvg className={className}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 12L8.85 9.35" />
      <path d="M12 12L15.55 10" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </KpiSvg>
  );
}

function KpiStat({
  icon: Icon,
  label,
  value,
  count,
  suffix = '',
  context,
  detail,
  loading,
  onClick,
  progress = null,
  hero = false,
}) {
  const animated = useCountUp(count ?? 0);
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      data-on-dark
      className={`kpi-folder group relative flex h-full min-h-[9.75rem] w-full appearance-none flex-col border-0 bg-transparent p-0 text-left text-white shadow-none transition-transform duration-[200ms] ease-out hover:-translate-y-0.5 ${onClick ? `cursor-pointer ${FOCUS_RING}` : ''}`}
    >
      <span className="kpi-folder-surface" aria-hidden />

      <span className="kpi-folder-content">
        <span className={`flex w-full items-start justify-between gap-3 ${hero ? 'pt-2' : ''}`}>
          <span className="min-w-0 pt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/80">
            {label}
          </span>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/30 bg-white/15 text-white">
            <Icon className="h-4 w-4" />
          </span>
        </span>

        <span className="mt-2 block w-full">
          {loading ? (
            <span className="skeleton block h-7 w-20 rounded-lg bg-white/20" aria-hidden />
          ) : (
            <span className="block text-[26px] font-bold leading-none tracking-tight tabular-nums text-white" style={{ color: '#FFFFFF' }}>
              {count != null ? `${formatNumber(animated)}${suffix}` : value}
            </span>
          )}
        </span>

        {typeof progress === 'number' && (
          <span className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/25" aria-hidden>
            <span
              className="block h-full rounded-full bg-white"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </span>
        )}

        <span className={`mt-auto flex flex-col pt-2 ${loading ? 'opacity-0' : ''}`}>
          {context && (
            <span className="block text-caption font-medium leading-snug text-white/80">{context}</span>
          )}
          {detail && (
            <span className="mt-1 block text-caption leading-snug text-white/65">{detail}</span>
          )}
        </span>
      </span>
    </Tag>
  );
}

/** Compact ops metric — white layered tile on soft-sky operations surface. */
function OpsTile({ label, value, caption, tone = 'neutral', onClick }) {
  const Tag = onClick ? 'button' : 'div';
  const valueTone = {
    neutral: 'text-[#0F172A]',
    warning: 'text-warning-ink',
    danger: 'text-danger-ink',
    good: 'text-[#00BCFF]',
  };

  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      className={`group/ops relative flex flex-col gap-1 overflow-hidden rounded-xl border border-[#70C9EF]/35 bg-white p-3 text-left shadow-[0_2px_10px_rgba(112,201,239,0.08)] transition-all duration-200 ease-out ${
        onClick
          ? `hover:-translate-y-px hover:border-[#70C9EF] hover:shadow-[0_6px_16px_rgba(112,201,239,0.16)] ${FOCUS_RING}`
          : ''
      }`}
    >
      <span className="text-caption font-medium leading-tight text-[#64748B]">{label}</span>
      <span className={`text-heading font-semibold leading-none tabular-nums ${valueTone[tone]}`}>
        {value}
      </span>
      <span className="truncate text-micro font-medium leading-tight text-[#64748B]">{caption}</span>
    </Tag>
  );
}

/**
 * Check-ins by time: seven days across, two-hour bands down, intensity by volume.
 *
 * This replaced a single row of hourly bars for today. A one-day strip answers "how
 * busy was this morning"; the matrix answers "when is this team actually here",
 * which is the question a rota gets built from — Monday mornings against Friday
 * afternoons is a pattern no single day can show.
 *
 * Cells are not interactive. Making 49 of them focusable would put the whole grid
 * between the reader and the next control for the sake of a drill-down the card
 * header already offers, so hover carries the exact count and the grid announces
 * itself once as an image with a spoken summary.
 */
function CheckinHeatmap({ matrix, onOpen, onRefresh }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const triggerRef = useRef(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const rootRef = useDismiss(closeMenu, triggerRef);
  const { containerRef, onKeyDown } = useMenuNavigation({ open: menuOpen, onClose: closeMenu });
  const reduceMotion = prefersReducedMotion();

  const { rows, days, total, busiest, busiestBand } = matrix;

  const refresh = async () => {
    closeMenu();
    if (!onRefresh || refreshing) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  /* Fixed density key — matches absolute gradient bands. */
  const legend = [1, 2, 3].map((level) => ({
    level,
    ...HEATMAP_LEVELS[level],
  }));

  const summary =
    total > 0
      ? `${total} check-ins over the last 7 days. Busiest on ${busiest?.label} and between ${busiestBand?.label}.`
      : 'No check-ins in the last 7 days.';

  return (
    <div className="flex min-h-[6rem] flex-1 flex-col">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-caption font-semibold text-ink">Check-ins by time</p>
          <p className="mt-0.5 text-micro text-ink-muted">
            Last 7 days · per {HEATMAP_BAND_HOURS}-hour band
          </p>
        </div>

        <div ref={rootRef} className="relative shrink-0">
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Check-in heatmap options"
            className={`grid h-8 w-8 place-items-center rounded-full text-ink-muted transition-colors duration-200 ease-premium hover:bg-[#E6F4FA] hover:text-[#00BCFF] ${FOCUS_RING}`}
          >
            <MoreHorizontal className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>

          {menuOpen && (
            <MenuPanel
              label="Check-in heatmap options"
              containerRef={containerRef}
              onKeyDown={onKeyDown}
              className="absolute right-0 top-9 z-20 w-48"
            >
              {onOpen && (
                <MenuItem icon={ArrowUpRight} onSelect={() => { closeMenu(); onOpen(); }}>
                  Open attendance
                </MenuItem>
              )}
              {onRefresh && (
                <MenuItem icon={RefreshCw} onSelect={refresh} disabled={refreshing}>
                  {refreshing ? 'Refreshing…' : 'Refresh data'}
                </MenuItem>
              )}
            </MenuPanel>
          )}
        </div>
      </div>

      {total === 0 ? (
        <div className="mt-3 flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-hairline bg-surface-subtle px-4 py-8 text-center">
          <span className="grid h-10 w-10 place-items-center rounded-full border border-[#E6F4FA] bg-[#E6F4FA] text-[#00BCFF] shadow-hair">
            <Clock className="h-4 w-4" strokeWidth={2} aria-hidden />
          </span>
          <div className="space-y-1">
            <p className="text-label font-semibold text-ink">No attendance activity yet</p>
            <p className="max-w-xs text-caption font-medium text-ink-muted">
              Check-ins will appear here once employees start their workday.
            </p>
          </div>
          {onRefresh && (
            <button type="button" onClick={refresh} className={`${BTN_QUIET} ${BTN_SM} min-h-[44px] ${FOCUS_RING}`}>
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`}
                strokeWidth={2.25}
                aria-hidden
              />
              {refreshing ? 'Refreshing…' : 'Refresh data'}
            </button>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-5">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:w-16 sm:flex-col sm:items-start sm:justify-center sm:gap-2.5">
            {legend.map((item) => (
              <li key={item.level} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-[4px] ring-1 ring-white/70"
                  style={{ backgroundImage: item.gradient }}
                  aria-hidden
                />
                <span className="text-micro font-medium tabular-nums text-ink-muted">{item.label}</span>
              </li>
            ))}
          </ul>

          <div
            role="img"
            aria-label={summary}
            className="grid min-w-0 flex-1 gap-1.5"
            style={{ gridTemplateColumns: `auto repeat(${HEATMAP_DAYS}, minmax(0, 1fr))` }}
          >
            {rows.map((row, rowIndex) => (
              <Fragment key={row.label}>
                <span className="pr-1.5 text-right text-micro font-medium leading-8 text-ink-muted">
                  {row.label}
                </span>
                {row.cells.map((cell, dayIndex) => {
                  const tone = HEATMAP_LEVELS[cell.level] || HEATMAP_LEVELS[0];
                  return (
                    <motion.span
                      key={`${row.label}-${cell.day.dateLabel}`}
                      title={`${row.rangeLabel} · ${cell.day.label} ${cell.day.dateLabel} · ${cell.count} check-in${cell.count === 1 ? '' : 's'}`}
                      className={`heatmap-cell h-8 rounded-md ${tone.pulse ? 'heatmap-cell-pulse' : ''}`}
                      style={{
                        backgroundImage: tone.gradient,
                        border: tone.border,
                        backgroundSize: tone.pulse ? '200% 200%' : undefined,
                      }}
                      initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={
                        reduceMotion
                          ? { duration: 0 }
                          : {
                              type: 'spring',
                              stiffness: 420,
                              damping: 28,
                              delay: dayIndex * 0.045 + rowIndex * 0.03,
                            }
                      }
                      whileHover={
                        reduceMotion
                          ? undefined
                          : {
                              scale: 1.08,
                              y: -2,
                              boxShadow: tone.glow,
                              transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
                            }
                      }
                    />
                  );
                })}
              </Fragment>
            ))}

            <span aria-hidden />
            {days.map((day) => (
              <span
                key={day.dateLabel}
                className={`truncate text-center text-micro font-medium ${
                  day.today ? 'text-accent-600' : 'text-ink-muted'
                }`}
              >
                {day.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Card 1 (primary) — the operational view of today, read top to bottom: coverage
 * summary, the six exception counts a lead has to act on, then when people
 * actually arrived. The ring stays proportional to headcount.
 */
function AttendanceOpsCard({
  metrics,
  headcount,
  onShiftNow,
  ops,
  heatmap,
  onLeaveCount,
  onOpen,
  onOpenLeaves,
  onRefresh,
}) {
  const [range, setRange] = useState('today');
  const [hoverKey, setHoverKey] = useState(null);
  const [legendReady, setLegendReady] = useState(prefersReducedMotion());
  const active = metrics[range] || metrics.today;

  const covered = Math.min(active.uniqueCheckins, headcount);
  const absent = Math.max(headcount - covered, 0);
  const values = { onSite: active.onSite, remote: active.remote, absent };
  const segments = HEALTH_SEGMENTS.map((segment) => ({
    ...segment,
    value: Math.max(values[segment.key] || 0, 0),
  }));
  const coverage = headcount ? Math.round((covered / headcount) * 100) : 0;
  const rangeLabel = (HEALTH_FILTERS.find((filter) => filter.id === range) || HEALTH_FILTERS[0]).label.toLowerCase();

  useEffect(() => {
    if (prefersReducedMotion()) {
      setLegendReady(true);
      return undefined;
    }
    setLegendReady(false);
    const timer = window.setTimeout(() => setLegendReady(true), 280);
    return () => window.clearTimeout(timer);
  }, [range, active.onSite, active.remote, absent, headcount]);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#C2ECF9] bg-[#E6F4FA] p-5 shadow-[0_4px_20px_rgba(0,188,255,0.06)] sm:p-6">
      <CardHeader
        tier="primary"
        eyebrow="Operations"
        title="Attendance today"
        meta={`${covered} of ${headcount} people accounted for ${rangeLabel}`}
        action={
          <>
            <div className="ui-segment" role="tablist" aria-label="Attendance range">
              {HEALTH_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  role="tab"
                  aria-selected={range === filter.id}
                  onClick={() => setRange(filter.id)}
                  className={`ui-segment-item ${range === filter.id ? 'ui-segment-item-active' : ''} ${FOCUS_RING}`}
                >
                  {filter.label}
                </button>
              ))}
        </div>
            <IconAction onClick={onOpen} label="Open attendance" />
          </>
        }
      />

      <div className={`${CARD_TIERS.primary.gap} flex flex-1 flex-col gap-4`}>
        {/* Reference-style attendance visualization: rows, connectors, cropped filled circles. */}
        <LayeredAttendanceViz
          segments={segments}
          headcount={headcount}
          covered={covered}
          coverage={coverage}
          rangeLabel={rangeLabel}
          activeKey={hoverKey}
          onHoverKey={setHoverKey}
          reveal={legendReady}
        />

        {/* Six exception counts — compact metric grid with semantic edge accents. */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          <OpsTile
            label="On shift now"
            value={onShiftNow}
            caption={onShiftNow ? 'Currently checked in' : 'Nobody on shift'}
            tone={onShiftNow ? 'good' : 'neutral'}
            onClick={onOpen}
          />
          <OpsTile
            label="Late arrivals"
            value={ops.late}
            caption="After 09:15"
            tone={ops.late ? 'warning' : 'neutral'}
            onClick={onOpen}
          />
          <OpsTile
            label="Missing check-in"
            value={absent}
            caption={`of ${headcount} active`}
            tone={absent ? 'warning' : 'good'}
            onClick={onOpen}
          />
          <OpsTile
            label="Open shifts"
            value={ops.openShifts}
            caption="No check-out, 7 days"
            tone={ops.openShifts ? 'danger' : 'neutral'}
            onClick={onOpen}
          />
          <OpsTile
            label="On leave"
            value={onLeaveCount}
            caption="Approved for today"
            onClick={onOpenLeaves || onOpen}
          />
          <OpsTile
            label="Manual entries"
            value={active.unverified}
            caption="Added by an admin"
            tone={active.unverified ? 'warning' : 'neutral'}
            onClick={onOpen}
          />
      </div>

        <div className="flex flex-1 flex-col border-t border-[#00BCFF]/15 pt-4">
          <CheckinHeatmap matrix={heatmap} onOpen={onOpen} onRefresh={onRefresh} />
        </div>
      </div>
    </div>
  );
}

/**
 * Card 2 — one queue for every inbound request. Leaves, work-mode changes and
 * urgent tickets share a single scroll list so nothing hides behind a tab.
 */
function ActionQueueCard({ items, approvableCount, busyId, batching, onBatchApprove, onOpen }) {
  const [confirmBatch, setConfirmBatch] = useState(false);
  /* A single approval is faster to handle in place than in a batch flow. */
  const showBatch = approvableCount > 1;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#70C9EF] bg-white p-5 shadow-[0_4px_20px_rgba(112,201,239,0.12)]">
      <CardHeader
        tier="secondary"
        eyebrow="Inbox"
        title="Action items"
        meta={
          items.length === 0
            ? 'Nothing waiting on a decision'
            : `${items.length} waiting${approvableCount ? ` · ${approvableCount} you can approve` : ''}`
        }
        action={<IconAction onClick={onOpen} label="View all requests" />}
      />

      <div
        className={`no-scrollbar ${CARD_TIERS.secondary.gap} flex ${CARD_TIERS.secondary.body} max-h-[26rem] flex-col gap-2.5 overflow-y-auto pr-0.5`}
      >
        {items.length === 0 ? (
          <CardEmpty
            icon={Check}
            title="You are all caught up"
            description="Leave, work-mode and urgent ticket requests land here the moment they are raised."
          />
        ) : (
          <>
            {items.map((item) => {
              const busy = item.recordId != null && busyId === item.recordId;
              const hasActions = Boolean(item.onApprove || item.onReject || item.onOpen);
              return (
                <div
                  key={item.id}
                  className="group/item rounded-2xl border border-[#70C9EF] bg-[#F8FCFD] p-4 transition-all duration-200 ease-out hover:-translate-y-px hover:bg-white hover:shadow-[0_6px_16px_rgba(112,201,239,0.14)]"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#70C9EF]/40 bg-[#E6F4FA] text-label font-semibold uppercase text-[#00BCFF]"
                      aria-hidden
                    >
                      {item.initials}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-body-tight font-semibold leading-snug text-ink">{item.detail}</p>
                      <p className="mt-1 truncate text-caption leading-tight text-ink-muted">
                        <span className="font-semibold text-ink">{item.person}</span>
                        {item.subtitle ? ` · ${item.subtitle}` : ''}
                      </p>
                    </div>

                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-micro font-semibold ${item.badgeClass}`}>
                      {item.badgeLabel}
                    </span>
                  </div>

                  {(item.meta?.length || item.urgent) && (
                    <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-hairline bg-surface-subtle/80 px-3 py-2">
                      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-caption tabular-nums text-ink-muted">
                        {item.meta.map((fact, index) => (
                          <span key={fact} className="inline-flex items-center gap-2">
                            {index > 0 && (
                              <span className="text-ink-faint" aria-hidden>
                                ·
                              </span>
                            )}
                            {fact}
                          </span>
                        ))}
                      </span>

                      {item.urgent && (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-amber-200 bg-[#FEF9C3] px-2 py-0.5 text-micro font-semibold tracking-tight text-amber-700">
                          <AlertCircle className="h-3 w-3 shrink-0 text-amber-600" strokeWidth={2.5} aria-hidden />
                          {item.urgent}
                        </span>
                      )}
                    </div>
                  )}

                  {item.reason && (
                    <p className="mt-2 line-clamp-2 rounded-lg border-l-2 border-[#70C9EF] bg-[#E6F4FA] px-3 py-2 text-caption italic leading-relaxed text-[#64748B]">
                      {item.reason}
                    </p>
                  )}

                  {hasActions && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {item.onReject && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={item.onReject}
                          className={`${BTN_SOFT_DANGER} min-h-[40px] ${FOCUS_RING}`}
                        >
                          <X className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                          Reject
                        </button>
                      )}
                      {item.onApprove && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={item.onApprove}
                          data-on-dark
                          className={`${BTN_SOFT_APPROVE} min-h-[40px] ${FOCUS_RING}`}
                        >
                          {busy ? (
                            'Working…'
                          ) : (
                            <>
                              <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                              Approve
                            </>
                          )}
                        </button>
                      )}
                      {!item.onApprove && !item.onReject && item.onOpen && (
                        <button
                          type="button"
                          onClick={item.onOpen}
                          className={`${BTN_QUIET} col-span-2 min-h-[40px] ${FOCUS_RING}`}
                        >
                          Open ticket
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>

      <div className={cardFooter('secondary')}>
        <span>
          Pending total <strong className="font-semibold text-ink">{items.length}</strong>
        </span>

        {showBatch ? (
          confirmBatch ? (
            <span className="flex items-center gap-2">
              <button
                type="button"
                disabled={batching}
                onClick={async () => {
                  await onBatchApprove();
                  setConfirmBatch(false);
                }}
                className={`font-semibold text-[#00BCFF] underline decoration-[#70C9EF] underline-offset-4 transition-colors hover:decoration-[#0090C4] ${FOCUS_RING}`}
              >
                {batching ? 'Approving…' : `Confirm ${approvableCount}`}
              </button>
              <button
                type="button"
                onClick={() => setConfirmBatch(false)}
                className={`text-ink-muted transition-colors hover:text-ink ${FOCUS_RING}`}
              >
                Cancel
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmBatch(true)}
              className={`font-semibold text-[#00BCFF] underline decoration-[#70C9EF] underline-offset-4 transition-colors hover:decoration-[#0090C4] ${FOCUS_RING}`}
            >
              Batch approve
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className={`font-semibold text-[#00BCFF] underline decoration-[#70C9EF] underline-offset-4 transition-colors hover:decoration-[#0090C4] ${FOCUS_RING}`}
          >
            View all requests
          </button>
        )}
      </div>
    </div>
  );
}

/** Card 4 — compact directory snapshot with live status. */
function DirectorySnapshotCard({ loading, directoryRows, onLeaveKeys, checkedInKeys, navigate }) {
  const presentCount = directoryRows.filter((row) =>
    userKeys(row).some((key) => checkedInKeys.has(key))
  ).length;
  const onLeaveCount = directoryRows.filter((row) => userKeys(row).some((key) => onLeaveKeys.has(key))).length;
  const offDutyCount = Math.max(directoryRows.length - presentCount - onLeaveCount, 0);
  /* Status split doubles as the legend for the presence dots on each row. */
  const statusSplit = [
    { label: 'On shift', value: presentCount, dot: 'bg-[#00BCFF]' },
    { label: 'On leave', value: onLeaveCount, dot: 'bg-warning-solid' },
    { label: 'Off duty', value: offDutyCount, dot: 'bg-ink-faint' },
  ];

  return (
    <article className="flex h-full flex-col rounded-2xl border border-[#00BCFF]/30 bg-white p-4 shadow-[0_4px_20px_rgba(0,188,255,0.06)] print:break-inside-avoid sm:p-5">
      <CardHeader
        tier="utility"
        title="Directory snapshot"
        meta={loading ? undefined : `${presentCount} of ${directoryRows.length} on shift now`}
        action={<GhostAction onClick={() => navigate('/users')}>View all</GhostAction>}
      />

      {!loading && directoryRows.length > 0 && (
        <div className={`${CARD_TIERS.utility.gap} flex items-center justify-between gap-4 rounded-2xl border border-[#00BCFF]/15 bg-[#E6F4FA] px-3 py-2`}>
          {statusSplit.map((entry) => (
            <span key={entry.label} className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${entry.dot}`} aria-hidden />
              <span className="text-caption font-medium text-[#64748B]">{entry.label}</span>
              <span className="text-label font-semibold tabular-nums text-[#0F172A]">{entry.value}</span>
            </span>
          ))}
        </div>
      )}

      <div
        className={`no-scrollbar ${CARD_TIERS.utility.gap} ${CARD_TIERS.utility.body} space-y-0.5 overflow-y-auto`}
        aria-busy={loading}
      >
          {loading &&
            Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="skeleton h-11 rounded-xl" aria-hidden />
            ))}

          {!loading && directoryRows.length === 0 && (
            <CardEmpty
              icon={Users}
              title="No people yet"
              description="Invite your team and their live attendance status will show up here."
              action={<GhostAction onClick={() => navigate('/users')}>Open Users</GhostAction>}
            />
          )}

          {!loading &&
            directoryRows.map((row) => {
              const displayName = row.name || row.username || 'Unnamed user';
              const onLeave = userKeys(row).some((key) => onLeaveKeys.has(key));
              const checkedIn = userKeys(row).some((key) => checkedInKeys.has(key));
              const status = !row.is_active
                ? 'inactive'
                : onLeave
                  ? 'on leave'
                  : checkedIn
                    ? 'checked in'
                    : 'off duty';

              return (
        <button
                  key={row.id || row.uid || row.username}
          type="button"
          onClick={() => navigate('/users')}
                  aria-label={`View ${displayName} in Users`}
                  className={`group/row flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-all duration-200 ease-out hover:bg-accent-50/80 hover:shadow-hair ${FOCUS_RING}`}
                >
                  <span className="relative shrink-0">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#E6F4FA] text-micro font-semibold uppercase leading-none text-[#00BCFF]">
                      {getInitials(displayName)}
                    </span>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${
                        checkedIn
                          ? 'bg-accent-600 ring-accent-200'
                          : onLeave
                            ? 'bg-warning-solid'
                            : 'bg-ink-faint'
                      }`}
                      aria-hidden
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-label font-semibold leading-tight text-ink">
                      {displayName}
                    </span>
                    <span className="block truncate text-caption leading-tight text-ink-muted">
                      {row.department || 'Unassigned'} · {String(row.role || 'Member').replace(/_/g, ' ')}
                    </span>
                  </span>
                  <StatusBadge status={status} dot={false} />
                  {/* Arrow fades in and leans toward its destination on hover. */}
                  <ArrowUpRight
                    className="h-3.5 w-3.5 shrink-0 text-[#00BCFF] opacity-0 transition-all duration-fast ease-premium group-hover/row:translate-x-0.5 group-hover/row:opacity-100"
                    strokeWidth={2}
                    aria-hidden
                  />
        </button>
              );
            })}
      </div>

      <div className={cardFooter('utility')}>
        <span>
          Showing <strong className="font-semibold text-ink">{directoryRows.length}</strong> of the directory
        </span>
        <span>
          Checked in <strong className="font-semibold text-[#00BCFF]">{presentCount}</strong>
        </span>
        </div>
    </article>
  );
}

/**
 * Card 5 — six months of check-in volume against the headcount that existed each
 * month. Reads header → headline total → chart → per-month context → legend, so
 * the visualisation is never the only thing in the card.
 */
function AttendanceTrendCard({ loading, data, isEmpty, monthDelta, onViewAttendance }) {
  const totalCheckins = data.reduce((sum, point) => sum + point.checkins, 0);
  const latest = data[data.length - 1];
  const busiest = data.reduce(
    (best, point) => (point.checkins > (best?.checkins ?? -1) ? point : best),
    null
  );
  const monthlyAverage = data.length ? Math.round(totalCheckins / data.length) : 0;

  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#70C9EF] bg-white p-5 shadow-[0_4px_20px_rgba(112,201,239,0.12)]">
      <CardHeader
        tier="secondary"
        eyebrow="Last 6 months"
        title="Attendance trend"
        action={<GhostAction onClick={onViewAttendance}>Attendance</GhostAction>}
      />

      {!loading && !isEmpty && (
        <div className={`${CARD_TIERS.secondary.gap} flex flex-wrap items-end justify-between gap-4`}>
          <span className="flex items-baseline gap-2">
            <span className="stat-value-sm">
              {formatNumber(totalCheckins)}
            </span>
            <span className="text-caption font-medium text-ink-muted">check-ins recorded</span>
          </span>
          <DeltaChip delta={monthDelta} suffix=" vs last month" />
          </div>
      )}

      {/* Negative left margin on the chart is offset here so it never touches the edge. */}
      <div className={`${CARD_TIERS.secondary.gap} ${CARD_TIERS.secondary.body} w-full pr-1`} aria-busy={loading}>
        {loading ? (
          <div className="skeleton h-full w-full rounded-xl" aria-hidden />
        ) : isEmpty ? (
          <CardEmpty
            icon={TrendingUp}
            title="No attendance history"
            description="Once your team starts checking in, six months of trend data builds up here."
          />
        ) : (
          <div className="h-full w-full animate-fade-in">
            <Suspense fallback={<div className="skeleton h-full w-full rounded-xl" aria-hidden />}>
              <AttendanceTrendAreaChart data={data} />
            </Suspense>
          </div>
        )}
      </div>

      {!loading && !isEmpty && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-[#70C9EF]/35 bg-[#E6F4FA] px-3 py-2.5">
            <p className="truncate text-micro font-medium text-[#64748B]">This month</p>
            <p className="mt-1 text-subheading font-semibold tabular-nums text-[#0F172A]">
              {formatNumber(latest?.checkins || 0)}
            </p>
          </div>
          <div className="rounded-2xl border border-[#70C9EF]/35 bg-[#E6F4FA] px-3 py-2.5">
            <p className="truncate text-micro font-medium text-[#64748B]">Monthly average</p>
            <p className="mt-1 text-subheading font-semibold tabular-nums text-[#0F172A]">{formatNumber(monthlyAverage)}</p>
          </div>
          <div className="rounded-2xl border border-[#70C9EF]/35 bg-[#E6F4FA] px-3 py-2.5">
            <p className="truncate text-micro font-medium text-[#64748B]">Busiest month</p>
            <p className="mt-1 truncate text-subheading font-semibold text-[#0F172A]">
              {busiest?.checkins ? busiest.label : '—'}
            </p>
          </div>
        </div>
      )}

      <div className={cardFooter('secondary')}>
        <span className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2">
            {/* Legend dots track CHART_COLORS.primary / .tertiary exactly. */}
            <span className="h-2 w-2 rounded-full bg-[#70C9EF]" aria-hidden />
            Check-ins
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#3ABCEF]" aria-hidden />
            Active headcount
          </span>
        </span>
        <span>
          Headcount now <strong className="font-semibold text-ink">{formatNumber(latest?.headcount || 0)}</strong>
        </span>
      </div>
    </div>
  );
}

/* Event type reads from the rail dot. Check-in uses brand cyan — presence without green. */
const ACTIVITY_STYLES = {
  checkin: {
    dot: '#00BCFF',
    label: 'Check-in',
    icon: LogIn,
    chip: 'bg-[#00BCFF] text-white',
    glow: 'shadow-[0_0_0_3px_rgba(0,188,255,0.22)]',
  },
  checkout: { dot: '#00BCFF', label: 'Check-out', icon: LogOut, chip: 'bg-[#E6F4FA] text-[#00BCFF]' },
  manual: { dot: '#F59E0B', label: 'Manual override', icon: PenLine, chip: 'bg-warning-surface text-warning-ink' },
  leave: { dot: '#00BCFF', label: 'Leave', icon: CalendarDays, chip: 'bg-[#E6F4FA] text-[#00BCFF]' },
  user: { dot: '#94A3B8', label: 'Profile update', icon: UserCog, chip: 'bg-surface-muted text-[#64748B]' },
};

/**
 * Card 2 (primary) — the operational feed. Events are grouped by day and hung off
 * a single rail so the eye tracks time down the left edge: clock, status dot,
 * then who did what.
 */
function ActivityTimelineCard({ loading, items, lastEventLabel, onOpen }) {
  /* Group in place: items already arrive newest-first. */
  const groups = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.label === item.group) last.items.push(item);
    else groups.push({ label: item.group, items: [item] });
  }

  /* Header summary counts only today's stream so the card opens with a takeaway. */
  const today = items.filter((item) => item.group === 'Today');
  const countOf = (kind) => today.filter((item) => item.kind === kind).length;
  const summary = [
    { key: 'checkin', label: 'Check-ins', value: countOf('checkin') },
    { key: 'checkout', label: 'Check-outs', value: countOf('checkout') },
    { key: 'manual', label: 'Manual', value: countOf('manual') },
  ];

  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#00BCFF]/25 bg-white p-4 shadow-[0_4px_20px_rgba(0,188,255,0.06)] sm:p-5">
      <CardHeader
        tier="utility"
        title="Live activity"
        meta={loading ? undefined : `Last event ${lastEventLabel}`}
        action={onOpen ? <IconAction onClick={onOpen} label="Open attendance log" /> : null}
      />

      {!loading && items.length > 0 && (
        <div className={`${CARD_TIERS.utility.gap} grid grid-cols-3 gap-2`}>
          {summary.map((entry) => {
            const meta = ACTIVITY_STYLES[entry.key];
            return (
              <div
                key={entry.key}
                className="rounded-2xl border border-[#00BCFF]/20 bg-[#E6F4FA] px-3 py-2"
              >
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#00BCFF]" style={{ backgroundColor: meta.dot }} aria-hidden />
                  <span className="truncate text-micro font-medium text-[#64748B]">{entry.label}</span>
                </span>
                <span className="mt-1 block text-subheading font-semibold tabular-nums text-[#00BCFF]">{entry.value}</span>
              </div>
            );
          })}
        </div>
      )}

      <div
        className={`no-scrollbar ${CARD_TIERS.utility.gap} min-h-[16rem] flex-1 overflow-y-auto pr-0.5 lg:min-h-[20rem]`}
        aria-busy={loading}
      >
        {loading && (
          <div className="space-y-2" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-10 rounded-lg" />
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <CardEmpty
            icon={Clock}
            title="No activity yet"
            description="Check-ins, check-outs and approvals stream in here as they happen."
          />
        )}

        {!loading &&
          groups.map((group) => (
            <div key={group.label} className="mb-2 last:mb-0">
              <p className="sticky top-0 z-10 flex items-center gap-2 bg-white/95 py-1.5 text-micro font-semibold uppercase tracking-[0.07em] text-ink-muted backdrop-blur">
                {group.label}
                <span className="h-px flex-1 bg-[#00BCFF]/25" aria-hidden />
              </p>

              <ul className="relative">
                {/* Continuous rail behind the dots ties the group into one thread. */}
                <span className="absolute bottom-3 left-[3.75rem] top-3 w-px bg-[#00BCFF]/35" aria-hidden />

                {group.items.map((item) => {
                  const meta = ACTIVITY_STYLES[item.kind] || ACTIVITY_STYLES.user;
                  const ActivityIcon = meta.icon;
                  return (
                    <li
                      key={`${item.person}-${item.action}-${item.ts}`}
                      className="relative flex items-center gap-3 rounded-xl py-2.5 pl-1 pr-2 transition-colors duration-200 ease-out hover:bg-accent-50/70"
                    >
                      <time
                        dateTime={item.ts}
                        className="w-9 shrink-0 text-right text-caption font-medium tabular-nums text-ink-muted"
                      >
                        {item.clock}
                      </time>
                      <span className="relative z-10 grid h-4 w-4 shrink-0 place-items-center">
                        <span
                          className={`h-2 w-2 rounded-full ring-2 ring-white ${meta.glow || ''}`}
                          style={{ backgroundColor: meta.dot }}
                          aria-hidden
                        />
                        <span className="sr-only">{meta.label}</span>
                      </span>
                      {/* Avatar carries who, the corner badge carries what — one glance, two facts. */}
                      <span className="relative shrink-0">
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-[#E6F4FA] text-micro font-semibold uppercase leading-none text-[#00BCFF]">
                          {getInitials(item.person)}
                  </span>
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full ring-2 ring-white ${meta.chip}`}
                          aria-hidden
                        >
                          <ActivityIcon className="h-2.5 w-2.5" strokeWidth={2.5} />
                </span>
                </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-label font-semibold leading-tight text-ink">
                          {item.person}
                        </span>
                        <span className="block truncate text-caption leading-tight text-ink-muted">{item.action}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
      </div>

      {!loading && items.length > 0 && (
        <div className={cardFooter('utility')}>
          <span>
            Events shown <strong className="font-semibold text-ink">{items.length}</strong>
          </span>
          <span>Last event {lastEventLabel}</span>
          </div>
        )}
      </div>
  );
}

/** Card 3 (secondary) — one row per department: lead, headcount, share, attendance. */
function DepartmentBreakdownCard({ rows, loading, navigate, canManage }) {
  const totalHeadcount = rows.reduce((sum, row) => sum + row.total, 0);
  const unassigned = rows.find((row) => row.label === 'Unassigned')?.total || 0;
  const activeDepartments = rows.filter((row) => row.label !== 'Unassigned' && row.total > 0).length;
  const largest = rows.reduce((max, row) => Math.max(max, row.total), 0);
  const bars = rows.map((row, index) => ({
    ...row,
    color: rankColor(index),
    percentage: totalHeadcount ? Math.round((row.total / totalHeadcount) * 100) : 0,
    /* Bars are scaled against the largest department so small teams stay visible. */
    width: largest ? Math.max((row.total / largest) * 100, 4) : 0,
  }));
  const summary = bars
    .map((bar) => `${bar.label}: ${bar.total} people, ${bar.percentage} percent of workforce, ${bar.attendance} percent in today`)
    .join('. ');

  return (
    <div className="flex h-full flex-col rounded-2xl border border-[#00BCFF]/30 bg-white p-5 shadow-[0_4px_20px_rgba(0,188,255,0.06)]">
      <CardHeader
        tier="secondary"
        eyebrow="Team mix"
        title="Department breakdown"
        meta={`${formatNumber(totalHeadcount)} people across ${activeDepartments} department${
          activeDepartments === 1 ? '' : 's'
        }`}
        action={canManage ? <IconAction onClick={() => navigate('/departments')} label="Manage departments" /> : null}
      />

      <div className={`${CARD_TIERS.secondary.gap} ${CARD_TIERS.secondary.body}`} aria-busy={loading}>
        {loading ? (
          <div className="space-y-2" aria-hidden>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="skeleton h-[6.25rem] rounded-xl" />
            ))}
          </div>
        ) : bars.length === 0 ? (
          <CardEmpty
            icon={Building2}
            title="No departments yet"
            description="Group your people into departments to see how headcount is distributed."
            action={
              canManage ? <GhostAction onClick={() => navigate('/departments')}>Add department</GhostAction> : null
            }
          />
        ) : (
          <ul className="space-y-2" aria-label={`Headcount by department. ${summary}`}>
            {bars.map((bar) => (
              <li
                key={bar.label}
                className="rounded-2xl border border-[#00BCFF]/20 bg-[#F8FCFD] px-4 py-3 transition-all duration-200 ease-out hover:-translate-y-px hover:border-[#00BCFF]/40 hover:bg-white hover:shadow-[0_6px_16px_rgba(0,188,255,0.1)]"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#E6F4FA] text-micro font-semibold uppercase leading-none text-[#00BCFF]"
                    aria-hidden
                  >
                    {getInitials(bar.manager || bar.label)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-label font-semibold leading-tight text-[#0F172A]">{bar.label}</p>
                    <p className="mt-0.5 truncate text-micro leading-tight text-[#64748B]">
                      {bar.manager ? `Led by ${bar.manager}` : 'No manager assigned'}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {bar.added > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-md bg-success-surface px-1.5 py-0.5 text-micro font-semibold tabular-nums text-success-ink">
                        <TrendingUp className="h-3 w-3" strokeWidth={2.25} aria-hidden />
                        {bar.added}
                      </span>
                    )}
                    <span className="text-subheading font-semibold tabular-nums text-[#0F172A]">{bar.total}</span>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-4 text-micro tabular-nums text-[#64748B]">
                  <span>{bar.percentage}% of workforce</span>
                  <span>
                    <strong className="font-semibold text-[#00BCFF]">{bar.attendance}%</strong> in today
                  </span>
                </div>

                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E6F4FA]" aria-hidden>
                  <div
                    className="h-full rounded-full bg-[#00BCFF] transition-[width] duration-500 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, bar.attendance))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={cardFooter('secondary')}>
        <span>
          Active departments <strong className="font-semibold text-[#0F172A]">{activeDepartments}</strong>
        </span>
        <span>
          Unassigned <strong className="font-semibold text-[#0F172A]">{unassigned}</strong>
        </span>
      </div>
    </div>
  );
}

function ViewportGrowthCard({ loading, data }) {
  const isEmpty = !data.some((point) => (point.users || 0) > 0);

  return (
    <article className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <h2 className="mb-1 shrink-0 text-sm font-bold text-slate-900">User growth</h2>

      <div className="relative min-h-0 w-full flex-1">
        {loading ? (
          <div className="skeleton h-full w-full rounded-xl" aria-hidden />
        ) : isEmpty ? (
          <CardEmpty
            icon={TrendingUp}
            title="No growth history"
            description="New employee registrations will plot here as accounts are created."
          />
        ) : (
          <Suspense fallback={<div className="skeleton h-full w-full rounded-xl" aria-hidden />}>
            <UserGrowthLineChart data={data} />
          </Suspense>
        )}
      </div>
    </article>
  );
}

function ViewportAttendancePie({ loading, onSite, remote, notIn, coverage }) {
  const total = onSite + remote + notIn;
  const data = [
    { name: 'On-site', value: onSite, color: '#00B0FF', share: total ? Math.round((onSite / total) * 100) : 0 },
    { name: 'Remote', value: remote, color: '#70C8F4', share: total ? Math.round((remote / total) * 100) : 0 },
    { name: 'Not in', value: notIn, color: '#C2ECF9', share: total ? Math.round((notIn / total) * 100) : 0 },
  ];

  return (
    <article className="flex h-full min-h-0 flex-col rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <h2 className="mb-2 shrink-0 text-sm font-bold text-slate-900">Today’s mix</h2>
      <div className="flex min-h-0 w-full flex-[65] items-center justify-center">
        {loading ? (
          <div className="skeleton aspect-square h-full max-h-full w-auto max-w-full rounded-full" aria-hidden />
        ) : (
          <Suspense
            fallback={<div className="skeleton aspect-square h-full max-h-full w-auto max-w-full rounded-full" aria-hidden />}
          >
            <div className="aspect-square h-full max-h-full w-auto max-w-full">
              <AttendanceMixPieChart data={data} centerLabel={`${coverage}%`} centerHint="in today" />
            </div>
          </Suspense>
        )}
      </div>
      <ul className="mt-2 flex min-h-0 flex-[35] flex-col items-start justify-center gap-2.5 pl-0.5">
        {data.map((row) => (
          <li key={row.name} className="flex items-center gap-2.5 text-sm font-semibold text-slate-700">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: row.color }} aria-hidden />
            {row.name}
          </li>
        ))}
      </ul>
    </article>
  );
}

function ViewportActivityCard({ loading, items }) {
  const visibleItems = items.slice(0, 6);

  return (
    <article className="relative flex min-h-0 flex-[13] flex-col overflow-hidden rounded-2xl border border-[#B5E2FF] bg-[#B5E2FF] p-3 shadow-sm">
      <h2 className="mb-1 shrink-0 text-sm font-bold text-slate-900">Recent activity</h2>
      <div className="min-h-0 flex-1 space-y-1.5 overflow-hidden" aria-busy={loading}>
        {loading &&
          Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="skeleton h-8 rounded-lg" aria-hidden />
          ))}
        {!loading && items.length === 0 && (
          <p className="text-xs text-slate-600">Check-ins and approvals will stream in here.</p>
        )}
        {!loading &&
          visibleItems.map((item) => (
            <div
              key={`${item.person}-${item.action}-${item.ts}`}
              className="flex items-center gap-2.5 rounded-lg bg-white px-2 py-1.5"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#F0F9FD] text-[10px] font-semibold uppercase text-[#00B0FF]">
                {getInitials(item.person)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-slate-800">{item.person}</span>
                <span className="block truncate text-[11px] text-[#8898AA]">{item.action}</span>
              </span>
              <time className="shrink-0 text-[11px] text-[#8898AA]">{item.time}</time>
            </div>
          ))}
      </div>
    </article>
  );
}

function ViewportQuickActions({ actions }) {
  if (!actions.length) return null;

  return (
    <article className="flex min-h-0 flex-[7] flex-col justify-between gap-1.5 rounded-2xl border border-slate-100 bg-white p-2.5 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900">Quick actions</h2>
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            className={`flex items-center justify-between rounded-lg bg-[#B5E2FF] px-3 py-1.5 text-xs font-semibold text-slate-700 transition-all hover:bg-[#00B0FF] hover:text-white ${FOCUS_RING}`}
          >
            <span className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {action.label}
            </span>
            <ChevronRight className="h-3.5 w-3.5 opacity-70" aria-hidden />
          </button>
        );
      })}
    </article>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [cachedUsers, setCachedUsers] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [workModes, setWorkModes] = useState([]);
  const [activityItems, setActivityItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queueBusyId, setQueueBusyId] = useState(null);
  const [batching, setBatching] = useState(false);

      const canViewUsers = hasAnyPermission(user, [
        PERMISSIONS.VIEW_EMPLOYEES,
        PERMISSIONS.CREATE_USER,
        PERMISSIONS.EDIT_USER,
        PERMISSIONS.DELETE_USER,
      ]);
  const canViewAttendance = hasAnyPermission(user, [PERMISSIONS.VIEW_ATTENDANCE, PERMISSIONS.MANUAL_ATTENDANCE]);
      const canViewLeaves = hasAnyPermission(user, [
        PERMISSIONS.VIEW_LEAVE_REQUESTS,
        PERMISSIONS.APPROVE_LEAVE,
        PERMISSIONS.REJECT_LEAVE,
      ]);
  const canApproveLeave = hasPermission(user, PERMISSIONS.APPROVE_LEAVE);
  const canRejectLeave = hasPermission(user, PERMISSIONS.REJECT_LEAVE);
  const canViewWorkModes = canAccessFeature(user, 'workModeRequests');
  const canApproveWorkMode = hasPermission(user, PERMISSIONS.APPROVE_WORK_MODE);
  const canRejectWorkMode = hasPermission(user, PERMISSIONS.REJECT_WORK_MODE);
  const canManageDepartments = hasPermission(user, PERMISSIONS.MANAGE_DEPARTMENTS);
  const canViewTickets = canAccessFeature(user, 'tickets');

  const loadDashboard = useCallback(async (silent = false) => {
    setError('');
    if (!silent) setLoading(true);
    try {
      const canViewStats = hasPermission(user, PERMISSIONS.VIEW_HR_DASHBOARD);

      const [statsData, users, attendanceRows, leaveRows, ticketRows, workModeRows] = await Promise.all([
        canViewStats ? adminService.getStats() : Promise.resolve(null),
        canViewUsers ? adminService.getUsers() : Promise.resolve([]),
        canViewAttendance ? adminService.getAttendance() : Promise.resolve([]),
        canViewLeaves ? adminService.getLeaves() : Promise.resolve([]),
        canViewTickets ? adminService.getTickets() : Promise.resolve([]),
        canViewWorkModes ? adminService.getWorkModeRequests() : Promise.resolve([]),
      ]);

      let nextUsers = users || [];
      let nextAttendance = attendanceRows || [];
      let nextLeaves = leaveRows || [];
      let nextWorkModes = workModeRows || [];
      let nextStats = statsData || {
        totalEmployees: nextUsers.length,
        activeUsers: nextUsers.filter((u) => u.is_active).length,
        totalDepartments: 0,
        pendingLeaves: nextLeaves.filter((leave) => leave.status === 'pending').length,
        attendanceRecords: nextAttendance.length,
      };
      let mockActivity = [];

      /* When live attendance is empty, seed Soft UI preview data so KPIs / ops / heatmap render. */
      if (shouldSeedDashboardMock(nextAttendance)) {
        const mock = buildDashboardMock({ existingUsers: nextUsers });
        nextUsers = mock.users;
        nextAttendance = mock.attendance;
        nextLeaves = nextLeaves.length ? nextLeaves : mock.leaves;
        nextWorkModes = nextWorkModes.length ? nextWorkModes : mock.workModes;
        nextStats = {
          ...nextStats,
          ...mock.stats,
          pendingLeaves: Math.max(nextStats.pendingLeaves || 0, mock.stats.pendingLeaves),
        };
        mockActivity = mock.activity;
      }

      setStats(nextStats);
      setCachedUsers(nextUsers);
      setAttendance(nextAttendance);
      setLeaves(nextLeaves);
      setTickets(ticketRows || []);
      setWorkModes(nextWorkModes);
      const nameByKey = new Map();
      for (const row of nextUsers) {
        for (const key of userKeys(row)) nameByKey.set(key, row.name || row.username);
      }

      const activity = [];
      for (const leave of nextLeaves) {
        const ts = leave.processed_at || leave.requested_at;
        if (!ts) continue;
        activity.push({
          ts,
          kind: 'leave',
          person: formatEmployeeDisplay(leave),
          action: `${formatLeaveTypeLabel(leave.leave_type)} ${String(leave.status || 'pending').replace(/_/g, ' ')}`,
        });
      }
      for (const row of nextAttendance) {
        if (!row.timestamp) continue;
        const type = normalizeAttendanceType(row.type);
        activity.push({
          ts: row.timestamp,
          kind: row.is_manual ? 'manual' : type === 'checkout' ? 'checkout' : 'checkin',
          person: toTitleCaseName(
            row.name || row.employee_name || nameByKey.get(attendanceUserKey(row)) || row.username
          ),
          action: row.is_manual
            ? 'Manual attendance entry'
            : type === 'checkout'
              ? 'Checked out'
              : 'Checked in',
        });
      }
      for (const row of nextUsers) {
        const ts = row.updated_at || row.created_at;
        if (!ts) continue;
        activity.push({
          ts,
          kind: 'user',
          person: toTitleCaseName(row.name || row.username || row.email),
          action: 'Profile updated',
        });
      }

      for (const item of mockActivity) activity.push(item);

      setActivityItems(
        activity
          .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
          .slice(0, 12)
          .map((item) => ({
            ...item,
            time: formatRelativeTime(item.ts),
            clock: clockTime(item.ts),
            group: dayGroupLabel(item.ts),
          }))
      );
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Failed to load dashboard data');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user, canViewUsers, canViewAttendance, canViewLeaves, canViewTickets, canViewWorkModes]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useSilentPoll(loadDashboard, 30000, [user]);

  const processLeave = useCallback(
    async (id, status) => {
      setQueueBusyId(id);
      setError('');
      try {
        await adminService.processLeave(id, { status });
        setLeaves((prev) => prev.map((leave) => (leave.id === id ? { ...leave, status } : leave)));
        await loadDashboard(true);
      } catch (err) {
        setError(err?.response?.data?.error || err?.message || 'Failed to process leave request');
      } finally {
        setQueueBusyId(null);
      }
    },
    [loadDashboard]
  );

  const processWorkMode = useCallback(
    async (id, status) => {
      setQueueBusyId(id);
      setError('');
      try {
        await adminService.processWorkModeRequest(id, { status });
        setWorkModes((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
        await loadDashboard(true);
      } catch (err) {
        setError(err?.response?.data?.error || err?.message || 'Failed to process work mode request');
      } finally {
        setQueueBusyId(null);
      }
    },
    [loadDashboard]
  );

  const usersByKey = useMemo(() => {
    const map = new Map();
    for (const row of cachedUsers) {
      for (const key of userKeys(row)) map.set(key, row);
    }
    return map;
  }, [cachedUsers]);

  /* Today's attendance signal, split by the work mode recorded on each user. */
  const attendanceRanges = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekday = startOfToday.getDay();
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfToday.getDate() - (weekday === 0 ? 6 : weekday - 1));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const createBucket = (start) => ({
      start,
      onSite: new Set(),
      remote: new Set(),
      verified: 0,
      unverified: 0,
    });
    const buckets = {
      today: createBucket(startOfToday),
      week: createBucket(startOfWeek),
      month: createBucket(startOfMonth),
    };

    for (const row of attendance) {
      if (!row.timestamp) continue;
      if (normalizeAttendanceType(row.type) !== 'checkin') continue;
      const stamp = new Date(row.timestamp);
      if (Number.isNaN(stamp.getTime())) continue;

      const key = attendanceUserKey(row);
      const mode = String(usersByKey.get(key)?.work_mode || 'in_office').toLowerCase();
      const isRemote = REMOTE_MODES.has(mode);

      for (const bucket of Object.values(buckets)) {
        if (stamp < bucket.start) continue;
        if (row.is_manual) bucket.unverified += 1;
        else bucket.verified += 1;
        if (isRemote) bucket.remote.add(key || `remote-${bucket.remote.size}`);
        else bucket.onSite.add(key || `onsite-${bucket.onSite.size}`);
      }
    }

    const summarize = (bucket) => {
      const checkins = bucket.verified + bucket.unverified;
      return {
        onSite: bucket.onSite.size,
        remote: bucket.remote.size,
        verified: bucket.verified,
        unverified: bucket.unverified,
        checkins,
        uniqueCheckins: bucket.onSite.size + bucket.remote.size,
        compliance: checkins ? Math.round((bucket.verified / checkins) * 100) : 0,
      };
    };

    return {
      today: summarize(buckets.today),
      week: summarize(buckets.week),
      month: summarize(buckets.month),
    };
  }, [attendance, usersByKey]);

  const attendanceToday = attendanceRanges.today;

  /**
   * Who is on shift right now: the last event of the day per employee decides it,
   * so someone who checked out no longer counts as present.
   */
  const onShiftKeys = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const latest = new Map();

    for (const row of attendance) {
      if (!row.timestamp) continue;
      const stamp = new Date(row.timestamp);
      if (Number.isNaN(stamp.getTime()) || stamp < startOfToday) continue;
      const key = attendanceUserKey(row);
      if (!key) continue;
      const previous = latest.get(key);
      if (!previous || stamp > previous.stamp) {
        latest.set(key, { stamp, type: normalizeAttendanceType(row.type) });
      }
    }

    const keys = new Set();
    for (const [key, entry] of latest) {
      if (entry.type !== 'checkout') keys.add(key);
    }
    return keys;
  }, [attendance]);

  /**
   * Who has already checked in today, used by the department heatmap present counts.
   */
  const todayOps = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const firstCheckin = new Map();

    for (const row of attendance) {
      if (!row.timestamp) continue;
      const stamp = new Date(row.timestamp);
      if (Number.isNaN(stamp.getTime())) continue;
      if (stamp < startOfToday) continue;
      if (normalizeAttendanceType(row.type) !== 'checkin') continue;
      const key = attendanceUserKey(row);
      const seen = firstCheckin.get(key);
      if (!seen || stamp < seen) firstCheckin.set(key, stamp);
    }

    return { checkedInKeys: new Set(firstCheckin.keys()) };
  }, [attendance]);

  /**
   * Check-ins by day and time band for the last seven days.
   *
   * Intensity levels are quartiles of the busiest cell rather than fixed head-count
   * bands. A ten-person tenant and a thousand-person one both get a readable grid
   * that way; against fixed bands the small one renders as seven flat rows of the
   * palest tint and the large one saturates to solid teal everywhere. The cost is
   * that colour means "busy for this team" rather than an absolute count, so the
   * legend ships the computed edges and every cell states its own number on hover.
   */
  const checkinHeatmap = useMemo(() => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const dateKey = (date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

    const days = [];
    const indexByDate = new Map();
    for (let offset = HEATMAP_DAYS - 1; offset >= 0; offset -= 1) {
      const start = new Date(midnight);
      start.setDate(midnight.getDate() - offset);
      indexByDate.set(dateKey(start), days.length);
      days.push({
        label: WEEKDAY_LABELS[start.getDay()],
        dateLabel: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        today: offset === 0,
        total: 0,
      });
    }

    const bandCount = Math.ceil((ACTIVITY_WINDOW.to - ACTIVITY_WINDOW.from) / HEATMAP_BAND_HOURS);
    const counts = Array.from({ length: bandCount }, () =>
      Array.from({ length: HEATMAP_DAYS }, () => 0)
    );

    for (const row of attendance) {
      if (!row.timestamp || normalizeAttendanceType(row.type) !== 'checkin') continue;
      const stamp = new Date(row.timestamp);
      if (Number.isNaN(stamp.getTime())) continue;
      /* Matched on the calendar date rather than on elapsed milliseconds, so a clock
         change inside the window can't shift a whole column by one day. */
      const dayIndex = indexByDate.get(dateKey(stamp));
      if (dayIndex == null) continue;
      /* Arrivals outside the working window fold into the nearest edge band: a 04:00
         shift is unusual, but dropping it would make the grid disagree with the
         totals the rest of the card reports. */
      const band = Math.min(
        Math.max(Math.floor((stamp.getHours() - ACTIVITY_WINDOW.from) / HEATMAP_BAND_HOURS), 0),
        bandCount - 1
      );
      counts[band][dayIndex] += 1;
      days[dayIndex].total += 1;
    }

    let peak = 0;
    let total = 0;
    for (const band of counts) {
      for (const count of band) {
        peak = Math.max(peak, count);
        total += count;
      }
    }

    /* Absolute density bands match the gradient key (0 / 1–2 / 3–4 / 5–6 / 7+). */
    const step = 2;
    const levelOf = heatmapLevelOf;

    const rows = counts.map((band, index) => {
      const from = ACTIVITY_WINDOW.from + index * HEATMAP_BAND_HOURS;
      return {
        label: formatHourLabel(from),
        rangeLabel: `${formatHourLabel(from)}–${formatHourLabel(from + HEATMAP_BAND_HOURS)}`,
        cells: band.map((count, dayIndex) => ({
          count,
          level: levelOf(count),
          day: days[dayIndex],
        })),
      };
    });

    const busiest = days.reduce((best, day) => (day.total > (best?.total ?? -1) ? day : best), null);
    const busiestBand = rows.reduce(
      (best, band) => {
        const sum = band.cells.reduce((acc, cell) => acc + cell.count, 0);
        return sum > best.sum ? { sum, label: band.rangeLabel } : best;
      },
      { sum: -1, label: null }
    );

    return { rows, days, peak, total, step, busiest, busiestBand };
  }, [attendance]);

  const onLeaveKeys = useMemo(() => {
    const keys = new Set();
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    for (const leave of leaves) {
      if (String(leave.status || '').toLowerCase() !== 'approved') continue;
      const start = leave.start_date ? new Date(leave.start_date) : null;
      const end = leave.end_date ? new Date(leave.end_date) : null;
      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) continue;
      end.setHours(23, 59, 59, 999);
      if (today < start || today > end) continue;
      for (const value of [leave.employee_uid, leave.employeeUid, leave.employee_username, leave.username]) {
        if (value) keys.add(String(value).toLowerCase());
      }
    }
    return keys;
  }, [leaves]);

  const pendingLeaves = useMemo(
    () => leaves.filter((leave) => String(leave.status || '').toLowerCase() === 'pending').slice(0, 8),
    [leaves]
  );

  const urgentTickets = useMemo(
    () =>
      tickets
        .filter((ticket) => {
          const status = String(ticket.status || '').toLowerCase();
          const priority = String(ticket.priority || '').toLowerCase();
          return status !== 'closed' && status !== 'resolved' && (priority === 'high' || priority === 'urgent');
        })
        .slice(0, 8),
    [tickets]
  );

  const pendingWorkModes = useMemo(
    () => workModes.filter((row) => String(row.status || '').toLowerCase() === 'pending').slice(0, 8),
    [workModes]
  );

  /* Every inbound request in one list: leaves, work-mode changes, urgent tickets. */
  const actionQueue = useMemo(() => {
    const queue = [];
    /* Requests carry only an employee reference, so job details come from the directory. */
    const profileFor = (...candidates) => {
      for (const candidate of candidates) {
        if (!candidate) continue;
        const hit = usersByKey.get(String(candidate).toLowerCase());
        if (hit) return hit;
      }
      return null;
    };
    const roleLine = (profile, fallback) => {
      const role = profile?.role ? String(profile.role).replace(/_/g, ' ') : null;
      const department = profile?.department || fallback;
      return [role, department].filter(Boolean).join(' · ') || 'No role on file';
    };

    for (const leave of pendingLeaves) {
      const profile = profileFor(leave.employee_uid, leave.employeeUid, leave.employee_username, leave.username);
      const from = shortDate(leave.start_date);
      const to = shortDate(leave.end_date);
      const days = leaveDayCount(leave);
      const startsIn = daysUntil(leave.start_date);
      const meta = [];
      if (from) meta.push(to && to !== from ? `${from} – ${to}` : from);
      if (days) meta.push(`${days} day${days === 1 ? '' : 's'}`);
      const requestedAt = leave.requested_at || leave.created_at;
      if (requestedAt) meta.push(formatRelativeTime(requestedAt));

      queue.push({
        id: `leave-${leave.id}`,
        recordId: leave.id,
        initials: getInitials(profile?.name || formatEmployeeDisplay(leave)),
        person: formatEmployeeDisplay(leave),
        subtitle: roleLine(profile, leave.employee_department),
        detail: leaveRequestSummary(leave),
        meta,
        reason: leave.reason || null,
        urgent: startsIn != null && startsIn <= 2 ? (startsIn <= 0 ? 'Starts today' : 'Starts soon') : null,
        badgeLabel: 'Leave',
        badgeClass: 'border border-[#70C9EF] bg-[#F0F9FF] text-[#0F172A]',
        onApprove: canApproveLeave ? () => processLeave(leave.id, 'approved') : undefined,
        onReject: canRejectLeave ? () => processLeave(leave.id, 'rejected') : undefined,
      });
    }

    for (const request of pendingWorkModes) {
      const profile = profileFor(request.employee_uid, request.employee?.uid, request.employee?.username);
      const name = profile?.name || request.employee?.name || toTitleCaseName(request.employee_uid);
      const meta = [];
      const requestedAt = request.requested_at || request.created_at;
      if (requestedAt) meta.push(formatRelativeTime(requestedAt));
      if (request.current_step > 1) meta.push(`Step ${request.current_step}`);

      queue.push({
        id: `work-mode-${request.id}`,
        recordId: request.id,
        initials: getInitials(name),
        person: name,
        subtitle: roleLine(profile, null),
        detail: `${WORK_MODE_LABELS[request.current_work_mode] || 'Current'} → ${
          WORK_MODE_LABELS[request.requested_work_mode] || 'Requested'
        }`,
        meta,
        reason: request.reason || null,
        badgeLabel: 'Work mode',
        badgeClass: 'border border-[#70C9EF] bg-[#F0F9FF] text-[#0F172A]',
        onApprove: canApproveWorkMode ? () => processWorkMode(request.id, 'approved') : undefined,
        onReject: canRejectWorkMode ? () => processWorkMode(request.id, 'rejected') : undefined,
      });
    }

    for (const ticket of urgentTickets) {
      const raised = ticket.created_at || ticket.createdAt;
      const meta = [String(ticket.status || 'open').replace(/_/g, ' ')];
      if (raised) meta.push(formatRelativeTime(raised));

      queue.push({
        id: `ticket-${ticket.id}`,
        initials: 'TK',
        person: ticket.subject || 'Support ticket',
        subtitle: ticket.category_name || ticket.department || 'Support queue',
        detail: `${String(ticket.priority || 'high')} priority ticket awaiting triage`,
        meta,
        badgeLabel: 'Ticket',
        badgeClass: 'border border-[#70C9EF] bg-[#F0F9FF] text-[#0F172A]',
        onOpen: () => navigate('/tickets'),
      });
    }

    return queue;
  }, [
    pendingLeaves,
    pendingWorkModes,
    urgentTickets,
    usersByKey,
    canApproveLeave,
    canRejectLeave,
    canApproveWorkMode,
    canRejectWorkMode,
    processLeave,
    processWorkMode,
    navigate,
  ]);

  const batchApprove = useCallback(async () => {
    setBatching(true);
    try {
      if (canApproveLeave) {
        for (const leave of pendingLeaves) {
          await processLeave(leave.id, 'approved');
        }
      }
      if (canApproveWorkMode) {
        for (const request of pendingWorkModes) {
          await processWorkMode(request.id, 'approved');
        }
      }
    } finally {
      setBatching(false);
    }
  }, [
    canApproveLeave,
    canApproveWorkMode,
    pendingLeaves,
    pendingWorkModes,
    processLeave,
    processWorkMode,
  ]);

  const approvableCount =
    (canApproveLeave ? pendingLeaves.length : 0) + (canApproveWorkMode ? pendingWorkModes.length : 0);

  /**
   * Department roll-up: headcount, who leads it, how many of its people are in
   * today and how much it grew this month. Attendance share uses today's
   * check-ins, so a department with nobody in reads 0 rather than blank.
   */
  const departmentRows = useMemo(() => {
    const now = new Date();
    const map = new Map();

    for (const row of cachedUsers) {
      const department = row.department || 'Unassigned';
      const current =
        map.get(department) ||
        { label: department, active: 0, inactive: 0, total: 0, present: 0, added: 0, manager: null };
      current.total += 1;
      if (row.is_active) current.active += 1;
      else current.inactive += 1;
      if (userKeys(row).some((key) => todayOps.checkedInKeys.has(key))) current.present += 1;
      if (
        row.created_at &&
        new Date(row.created_at).getMonth() === now.getMonth() &&
        new Date(row.created_at).getFullYear() === now.getFullYear()
      ) {
        current.added += 1;
      }
      if (!current.manager && String(row.role || '').toLowerCase().includes('manager')) {
        current.manager = row.name || row.username;
      }
      map.set(department, current);
    }

    return [...map.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map((row) => ({
        ...row,
        attendance: row.active ? Math.round((row.present / row.active) * 100) : 0,
      }));
  }, [cachedUsers, todayOps]);

  /* Six-month attendance volume against the headcount that existed each month. */
  const attendanceTrend = useMemo(() => {
    const now = new Date();
    const buckets = [];
    const index = new Map();
    for (let i = 5; i >= 0; i -= 1) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const bucket = {
        key: `${start.getFullYear()}-${start.getMonth()}`,
        label: start.toLocaleDateString(undefined, { month: 'short' }),
        monthEnd: new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999),
        checkins: 0,
        headcount: 0,
      };
      buckets.push(bucket);
      index.set(bucket.key, bucket);
    }

    for (const row of attendance) {
      if (!row.timestamp || normalizeAttendanceType(row.type) !== 'checkin') continue;
      const date = new Date(row.timestamp);
      if (Number.isNaN(date.getTime())) continue;
      const bucket = index.get(`${date.getFullYear()}-${date.getMonth()}`);
      if (bucket) bucket.checkins += 1;
    }

    for (const bucket of buckets) {
      bucket.headcount = cachedUsers.filter((row) => {
        if (!row.created_at) return false;
        const created = new Date(row.created_at);
        return !Number.isNaN(created.getTime()) && created <= bucket.monthEnd;
      }).length;
    }

    return buckets.map(({ key, label, checkins, headcount }) => ({ key, label, checkins, headcount }));
  }, [attendance, cachedUsers]);

  const totalUsers = stats?.totalEmployees ?? cachedUsers.length;
  const activeUsers = stats?.activeUsers ?? cachedUsers.filter((row) => row.is_active).length;
  const pendingApprovals = stats?.pendingLeaves ?? pendingLeaves.length;
  const attendanceRate = activeUsers
    ? Math.min(100, Math.round((attendanceToday.uniqueCheckins / activeUsers) * 100))
    : 0;

  const deactivated = Math.max(totalUsers - activeUsers, 0);
  const roster = useMemo(() => {
    const departments = new Set();
    for (const row of cachedUsers) {
      if (row.department) departments.add(row.department);
    }
    return { departmentCount: departments.size };
  }, [cachedUsers]);

  /*
   * The queue lists are capped for rendering, so the KPI counts come from the raw
   * collections — otherwise a busy queue would report "8 leave" next to a total of 12.
   */
  const pendingCounts = useMemo(
    () => ({
      leaves: leaves.filter((row) => String(row.status || '').toLowerCase() === 'pending').length,
      workModes: workModes.filter((row) => String(row.status || '').toLowerCase() === 'pending').length,
    }),
    [leaves, workModes]
  );
  const remoteShare = attendanceToday.uniqueCheckins
    ? Math.round((attendanceToday.remote / attendanceToday.uniqueCheckins) * 100)
    : 0;
  const plural = (count, word) => `${formatNumber(count)} ${word}${count === 1 ? '' : 's'}`;

  const overviewStats = [
    {
      icon: KpiIconWorkforce,
      label: 'Total workforce',
      count: totalUsers,
      context: `${plural(activeUsers, 'active employee')} · ${formatNumber(deactivated)} deactivated`,
      detail: `${formatNumber(onShiftKeys.size)} on shift now · ${plural(roster.departmentCount, 'department')}`,
      onClick: canViewUsers ? () => navigate('/users') : undefined,
    },
    {
      icon: KpiIconCalendar,
      label: 'Attendance rate',
      count: attendanceRate,
      suffix: '%',
      context: `${formatNumber(attendanceToday.uniqueCheckins)} of ${formatNumber(activeUsers)} checked in today`,
      progress: attendanceRate,
      onClick: canViewAttendance ? () => navigate('/attendance') : undefined,
    },
    {
      icon: KpiIconWifi,
      label: 'Remote / hybrid',
      count: attendanceToday.remote,
      context: `${formatNumber(attendanceToday.onSite)} on-site · ${remoteShare}% of today's check-ins`,
      onClick: canViewWorkModes ? () => navigate('/work-mode-requests') : undefined,
    },
    {
      icon: KpiIconClock,
      label: 'Pending approvals',
      count: pendingApprovals,
      context: `${formatNumber(pendingCounts.leaves)} leave · ${formatNumber(pendingCounts.workModes)} work-mode`,
      onClick: canViewLeaves ? () => navigate('/leaves') : undefined,
    },
  ];

  const userGrowthSeries = useMemo(() => buildUserGrowthSeries(cachedUsers), [cachedUsers]);
  const canAccessCalendar = canAccessFeature(user, 'calendar');
  const quickActions = [
    canViewUsers && {
      label: 'Invite user',
      icon: UserPlus,
      onClick: () => navigate('/users', { state: { openCreate: true } }),
    },
    canManageDepartments && {
      label: 'New department',
      icon: Building2,
      onClick: () => navigate('/departments', { state: { focusCreate: true } }),
    },
    canViewTickets && {
      label: 'Log a ticket',
      icon: Ticket,
      onClick: () => navigate('/tickets'),
    },
    canAccessCalendar && {
      label: 'Add calendar event',
      icon: CalendarDays,
      onClick: () => navigate('/calendar'),
    },
  ].filter(Boolean);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-y-auto lg:overflow-hidden">
      {error && (
        <div role="alert" className="shrink-0 rounded-xl border border-danger-border bg-danger-surface px-3 py-2">
          <p className="text-xs font-medium text-danger-ink">{error}</p>
        </div>
      )}

      <OverviewBanner stats={overviewStats} loading={loading} />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-12">
        <div className="min-h-[12rem] lg:col-span-6 lg:h-full lg:min-h-0">
          <ViewportGrowthCard loading={loading} data={userGrowthSeries} />
        </div>
        <div className="flex min-h-0 flex-col gap-2.5 lg:col-span-3 lg:h-full">
          <ViewportActivityCard loading={loading} items={activityItems} />
          {quickActions.length > 0 && <ViewportQuickActions actions={quickActions} />}
        </div>
        <div className="min-h-[12rem] lg:col-span-3 lg:h-full lg:min-h-0">
          <ViewportAttendancePie
            loading={loading}
            onSite={attendanceToday.onSite}
            remote={attendanceToday.remote}
            notIn={Math.max(activeUsers - attendanceToday.uniqueCheckins, 0)}
            coverage={attendanceRate}
          />
        </div>
      </div>
    </div>
  );
}
