import { Fragment, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowUpRight,
  Building2,
  CalendarCheck,
  CalendarDays,
  Check,
  Clock,
  LogIn,
  LogOut,
  Minus,
  MoreHorizontal,
  PenLine,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  UserCog,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import { adminService } from '../services/adminService';
import { useAuthStore } from '../../auth/store/authStore';
import { canAccessFeature, hasAnyPermission, hasPermission, PERMISSIONS } from '../permissions';
import { normalizeAttendanceType } from '../utils/analyticsCharts';
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
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600/45 focus-visible:ring-offset-2';
/* One button vocabulary for the whole dashboard: filled cyan leads, outline follows. */
const BTN_BASE =
  'inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 ease-premium active:translate-y-px';
/* Same fill and white label as .ui-btn-primary, at this row's smaller geometry. */
const BTN_PRIMARY = `${BTN_BASE} bg-accent-700 text-white shadow-[0_1px_3px_rgba(0,90,102,0.28)] hover:bg-accent-800 hover:shadow-[0_6px_16px_rgba(0,131,143,0.3)]`;
const BTN_QUIET = `${BTN_BASE} border border-hairline bg-white text-ink-muted hover:border-accent-200 hover:bg-accent-50 hover:text-accent-800`;
const BTN_DANGER_QUIET = `${BTN_BASE} border border-hairline bg-white text-ink-muted hover:border-danger-border hover:bg-danger-surface hover:text-danger-ink`;
/* In-row actions stay compact so the request itself keeps the visual weight. */
const BTN_SM = 'px-2.5 py-1.5 text-caption';
/*
 * Queue decisions use soft tinted fills rather than a filled primary: two equally
 * weighted, full-width targets that press in on tap, iOS-style.
 */
const BTN_SOFT_BASE =
  'inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-caption font-semibold transition-all duration-200 ease-premium active:scale-[0.98] disabled:cursor-not-allowed';
/* Approve leads with brand cyan — not lime — so the queue matches the sidebar identity. */
const BTN_SOFT_APPROVE = `${BTN_SOFT_BASE} bg-accent-600 text-white shadow-[0_1px_3px_rgba(0,90,102,0.22)] hover:bg-accent-700`;
const BTN_SOFT_DANGER = `${BTN_SOFT_BASE} border border-hairline bg-white text-ink-muted hover:border-danger-border hover:bg-danger-surface hover:text-danger-ink`;
const ICON_BTN =
  'grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-hairline bg-white text-ink-muted transition-all duration-200 hover:border-accent-200 hover:bg-accent-50 hover:text-accent-800';
const HEALTH_FILTERS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
];
/*
 * Attendance split — cyan family only (sidebar brand #0097A7). No green.
 * Outer → ice cyan, mid → light→brand, inner → brand→deep teal.
 */
const HEALTH_SEGMENTS = [
  { key: 'onSite', label: 'On-site', color: '#0097A7', colorSoft: '#006978' },
  { key: 'remote', label: 'Remote / hybrid', color: '#4DD0E1', colorSoft: '#0097A7' },
  { key: 'absent', label: 'Not checked in', color: '#E6F7F9', colorSoft: '#C7EFF5' },
];

const WORK_MODE_LABELS = {
  in_office: 'In office',
  semi_remote: 'Semi remote',
  fully_remote: 'Fully remote',
};

/* Ordered bars use the shared rank ladder — see rankColor in chartTheme. */

const REMOTE_MODES = new Set(['semi_remote', 'fully_remote', 'remote', 'hybrid']);

/* Arrivals after 09:15 count as late, and the activity strip covers 06:00–20:00. */
const LATE_AFTER_MINUTES = 9 * 60 + 15;
const LATE_LABEL = '09:15';
const ACTIVITY_WINDOW = { from: 6, to: 20 };

/*
 * Check-ins-by-time matrix. Rows are two-hour bands, not single hours: the working
 * window is 14 hours long, and fourteen rows in the height this panel has would be
 * 8px each — a texture rather than a grid you can read a value off. Seven bands
 * against seven days also keeps the cells close to square.
 */
const HEATMAP_BAND_HOURS = 2;
const HEATMAP_DAYS = 7;
const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/*
 * Five steps of one hue, because the only variable encoded is volume — a second hue
 * would imply a second dimension. Level 0 keeps the page tone plus a hairline so a
 * band nobody checked into still occupies a visible slot: on an attendance grid the
 * empty cells are half the finding. The legend dots for the two palest steps carry a
 * ring, since a 10px dot of #E6F7F9 on white is otherwise invisible.
 */
const HEATMAP_LEVELS = [
  { cell: 'bg-page border border-hairline', dot: 'bg-page ring-1 ring-hairline-strong' },
  { cell: 'bg-accent-100', dot: 'bg-accent-100 ring-1 ring-accent-200' },
  /* Tier 3 — the ramp's light step, so the mid band is a token and not a one-off. */
  { cell: 'bg-accent-400', dot: 'bg-accent-400' },
  { cell: 'bg-accent-600', dot: 'bg-accent-600' },
  { cell: 'bg-accent-900', dot: 'bg-accent-900' },
];

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
 * Layered concentric attendance viz — soft cyan gradients tied to sidebar #0097A7.
 */
function LayeredAttendanceViz({
  onSite,
  remote,
  absent,
  headcount,
  coverage,
  activeKey,
  onHoverKey,
}) {
  const animatedCoverage = useCountUp(coverage, 820);
  const [progress, setProgress] = useState(prefersReducedMotion() ? 1 : 0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setProgress(1);
      return undefined;
    }
    setProgress(0);
    let frame;
    const started = performance.now();
    const duration = 960;
    const step = (now) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - (1 - t) ** 3;
      setProgress(eased);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [onSite, remote, absent, headcount]);

  const vb = 300;
  const cx = 150;
  const cy = 150;
  const maxR = 118;
  const safeHead = Math.max(headcount, 1);
  const pct = (n) => Math.round((Math.max(0, n) / safeHead) * 100);

  /* Staggered ease-out expand: outer → mid → inner */
  const layerT = (delay, span = 0.58) =>
    Math.max(0, Math.min(1, (progress - delay) / span));

  const rOuter = maxR * layerT(0);
  const rMid = maxR * Math.max(0.12, (onSite + remote) / safeHead) * layerT(0.1);
  const rInner = maxR * Math.max(0.08, onSite / safeHead) * layerT(0.2);

  const layers = [
    {
      key: 'absent',
      r: rOuter,
      fill: 'url(#attGradAbsent)',
      tip: { title: 'Not checked in', detail: `${absent} employees · ${pct(absent)}%` },
    },
    {
      key: 'remote',
      r: rMid,
      fill: 'url(#attGradRemote)',
      tip: { title: 'Remote / hybrid', detail: `${remote} employees · ${pct(remote)}%` },
    },
    {
      key: 'onSite',
      r: rInner,
      fill: 'url(#attGradOnSite)',
      tip: { title: 'On-site', detail: `${onSite} employees · ${pct(onSite)}%` },
    },
  ];

  const layerOpacity = (key) => {
    if (!activeKey) return 1;
    return activeKey === key ? 1 : 0.3;
  };

  const activeTip = layers.find((layer) => layer.key === activeKey)?.tip;

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[19rem]"
      role="img"
      aria-label={`${coverage} percent covered. On-site ${onSite}, remote ${remote}, not checked in ${absent}.`}
      onMouseLeave={() => onHoverKey?.(null)}
    >
      <svg viewBox={`0 0 ${vb} ${vb}`} className="h-full w-full overflow-visible" aria-hidden>
        <defs>
          <radialGradient id="attGradAbsent" cx="42%" cy="38%" r="68%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#F2FCFD" stopOpacity="0.78" />
            <stop offset="100%" stopColor="#E6F7F9" stopOpacity="0.52" />
          </radialGradient>
          <radialGradient id="attGradRemote" cx="40%" cy="36%" r="70%">
            <stop offset="0%" stopColor="#E6F7F9" stopOpacity="0.95" />
            <stop offset="38%" stopColor="#8FE3EE" stopOpacity="0.88" />
            <stop offset="78%" stopColor="#0097A7" stopOpacity="0.74" />
            <stop offset="100%" stopColor="#00838F" stopOpacity="0.58" />
          </radialGradient>
          <radialGradient id="attGradOnSite" cx="38%" cy="34%" r="72%">
            <stop offset="0%" stopColor="#4DD0E1" stopOpacity="0.95" />
            <stop offset="42%" stopColor="#0097A7" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#006978" stopOpacity="0.92" />
          </radialGradient>
          <radialGradient id="attCenterGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="55%" stopColor="#F2FCFD" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#E6F7F9" stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx={cx} cy={cy} r={maxR + 8} fill="url(#attCenterGlow)" opacity={0.85 * progress} />

        {layers.map((layer) => {
          if (layer.r < 0.5) return null;
          const boost = activeKey === layer.key;
          return (
            <circle
              key={layer.key}
              cx={cx}
              cy={cy}
              r={layer.r}
              fill={layer.fill}
              stroke={boost ? 'rgba(0, 151, 167, 0.38)' : 'rgba(255, 255, 255, 0.55)'}
              strokeWidth={boost ? 1.6 : 1}
              opacity={layerOpacity(layer.key)}
              className="cursor-pointer"
              style={{
                transition: 'opacity 200ms ease-out, stroke 200ms ease-out, stroke-width 200ms ease-out',
                filter: boost ? 'saturate(1.12) brightness(1.04)' : undefined,
              }}
              onMouseEnter={() => onHoverKey?.(layer.key)}
            />
          );
        })}

        <circle
          cx={cx}
          cy={cy}
          r={44 * Math.max(progress, 0.01)}
          fill="url(#attCenterGlow)"
          stroke="rgba(0, 151, 167, 0.12)"
          strokeWidth="1"
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[2.75rem] font-bold leading-none tracking-tight tabular-nums text-[#0F282F]">
          {animatedCoverage}%
        </span>
        <span className="mt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#00838F]">
          Covered
        </span>
      </div>

      {activeTip && (
        <div className="pointer-events-none absolute left-1/2 top-2 z-10 w-max max-w-[92%] -translate-x-1/2 rounded-xl border border-[#C7EFF5] bg-white/95 px-3 py-2 text-center shadow-[0_8px_24px_-10px_rgba(0,151,167,0.22)] transition-opacity duration-[200ms] ease-out">
          <p className="text-[12px] font-semibold text-[#0F282F]">{activeTip.title}</p>
          <p className="mt-0.5 text-[11px] font-medium text-[#64748B]">{activeTip.detail}</p>
        </div>
      )}
    </div>
  );
}

/** Cyan-family analytics legend — intensity distinguishes categories, no green. */
function AttendanceSegmentLegend({ segments, headcount, activeKey, onHoverKey, reveal }) {
  const share = (value) => (headcount ? Math.round((value / headcount) * 100) : 0);

  const indicatorStyle = (key) => {
    if (key === 'onSite') {
      return { background: 'linear-gradient(135deg, #0097A7 0%, #006978 100%)' };
    }
    if (key === 'remote') {
      return { background: 'linear-gradient(135deg, #8FE3EE 0%, #0097A7 100%)' };
    }
    return {
      background: 'linear-gradient(135deg, #F2FCFD 0%, #C7EFF5 100%)',
      border: '1px solid #C7EFF5',
    };
  };

  return (
    <ul className="flex h-full w-full flex-col justify-center">
      {segments.map((segment, index) => {
        const pct = share(segment.value);
        const active = activeKey === segment.key;
        const muted = Boolean(activeKey && !active);
        return (
          <li
            key={segment.key}
            className="flex cursor-pointer items-center gap-3 border-b border-[#E6F7F9] py-4 last:border-b-0"
            style={{
              opacity: reveal ? (muted ? 0.38 : 1) : 0,
              transform: reveal ? 'translateY(0)' : 'translateY(6px)',
              transition: 'opacity 360ms ease-out, transform 360ms ease-out',
              transitionDelay: reveal ? `${index * 80}ms` : '0ms',
            }}
            onMouseEnter={() => onHoverKey?.(segment.key)}
            onMouseLeave={() => onHoverKey?.(null)}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full transition-shadow duration-[200ms] ease-out"
              style={{
                ...indicatorStyle(segment.key),
                boxShadow: active ? '0 0 0 4px rgba(0, 151, 167, 0.16)' : undefined,
              }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-[#0F282F]">
              {segment.label}
            </span>
            <span className="shrink-0 text-[15px] font-semibold tabular-nums text-[#0F282F]">
              {segment.value}
            </span>
            <span className="w-12 shrink-0 text-right text-[13px] font-medium tabular-nums text-[#64748B]">
              {pct}%
            </span>
          </li>
        );
      })}
    </ul>
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
      className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-hairline bg-white px-2.5 text-xs font-semibold text-ink-muted transition-all duration-200 hover:border-accent-200 hover:bg-accent-50 hover:text-accent-800 ${FOCUS_RING}`}
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
function OverviewBanner({ adminName, stats, loading, statusPills = [] }) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-micro font-semibold uppercase tracking-[0.08em] text-accent-700">Dashboard</p>
          <h1 className="mt-1 truncate text-title font-semibold tracking-tight text-ink sm:text-title-lg">
            Welcome back, {adminName}
          </h1>
          <p className="mt-1.5 max-w-xl text-label font-normal text-ink-muted">
            Here&apos;s the live state of your workforce right now.
          </p>
        </div>

        {statusPills.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {statusPills.map((pill) => (
              <span key={pill.label} className="dash-status-pill">
                <span className="dash-status-pill-dot" aria-hidden />
                {pill.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Mobile: horizontal snap scroll. Desktop: equal 4-up with lead emphasis via surface. */}
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-1 snap-x snap-mandatory sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div key={stat.label} className="min-w-[17rem] shrink-0 snap-start sm:min-w-0">
            <KpiStat {...stat} hero={index === 0} loading={loading} />
          </div>
        ))}
      </div>
    </section>
  );
}

/** Semantic insight dots — cyan for brand-neutral; amber/red only for attention. */
const KPI_STATUS_DOTS = {
  neutral: 'bg-accent-600',
  good: 'bg-accent-700',
  watch: 'bg-amber-400',
  urgent: 'bg-[#EF4444]',
};

/**
 * White KPI card with cyan accent — strong metric hierarchy, quiet insight footer.
 */
function KpiStat({
  icon: Icon,
  label,
  value,
  count,
  suffix = '',
  context,
  detail,
  insight,
  insightTone = 'neutral',
  hero = false,
  loading,
  onClick,
  progress = null,
}) {
  const animated = useCountUp(count ?? 0);
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      className={`kpi-folder group relative flex h-full w-full flex-col overflow-visible p-5 pt-9 text-left transition-transform duration-[200ms] ease-out hover:-translate-y-0.5 ${
        hero ? 'kpi-folder--lead' : ''
      } ${FOCUS_RING}`}
    >
      <span className="kpi-folder-surface" aria-hidden />

      <span
        className={`pointer-events-none absolute bottom-4 left-5 top-9 w-0.5 rounded-full bg-accent-600 transition-opacity duration-[200ms] ease-out ${
          hero ? 'opacity-100' : 'opacity-35 group-hover:opacity-70'
        }`}
        aria-hidden
      />

      <span className="relative flex w-full flex-1 flex-col pl-2.5 text-ink">
        <span className="flex w-full items-center justify-between gap-3">
          <span className="truncate text-micro font-semibold uppercase tracking-[0.1em] text-accent-700">
            {label}
          </span>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-accent-200 bg-accent-50 text-accent-700 transition-all duration-[200ms] ease-out group-hover:border-accent-300 group-hover:bg-accent-100">
            <Icon className="h-4 w-4" strokeWidth={1.9} aria-hidden />
          </span>
        </span>

        <span className="mt-2.5 block w-full">
          {loading ? (
            <span className="skeleton block h-9 w-24 rounded-lg" aria-hidden />
          ) : (
            <span
              className={`block font-semibold tracking-tight tabular-nums text-ink ${
                hero ? 'text-display' : 'text-metric'
              }`}
            >
              {count != null ? `${formatNumber(animated)}${suffix}` : value}
            </span>
          )}
        </span>

        {typeof progress === 'number' && (
          <span className="ui-track mt-3 h-1 w-full" aria-hidden>
            <span
              className="ui-track-fill bg-accent-600"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </span>
        )}

        {context && (
          <span className={`mt-2 block truncate text-caption font-medium text-ink-muted ${loading ? 'opacity-0' : ''}`}>
            {context}
          </span>
        )}

        {detail && (
          <span className={`mt-1 block truncate text-caption text-ink-faint ${loading ? 'opacity-0' : ''}`}>
            {detail}
          </span>
        )}

        {insight && (
          <span className={`mt-auto block w-full pt-4 ${loading ? 'opacity-0' : ''}`}>
            <span
              className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 ${
                insightTone === 'watch'
                  ? 'border-amber-200/80 bg-amber-50/90'
                  : insightTone === 'urgent'
                    ? 'border-red-200/80 bg-red-50/90'
                    : 'border-accent-200 bg-accent-50/80'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${KPI_STATUS_DOTS[insightTone]}`}
                aria-hidden
              />
              <span className="truncate text-caption font-semibold text-ink">{insight}</span>
            </span>
          </span>
        )}
      </span>
    </Tag>
  );
}

/** Compact ops metric — accent edge carries semantic tone without rainbow fills. */
function OpsTile({ label, value, caption, tone = 'neutral', onClick }) {
  const Tag = onClick ? 'button' : 'div';
  const edge = {
    neutral: 'bg-accent-600/50',
    warning: 'bg-amber-400',
    danger: 'bg-danger-solid',
    good: 'bg-accent-700',
  };
  const valueTone = {
    neutral: 'text-ink',
    warning: 'text-warning-ink',
    danger: 'text-danger-ink',
    good: 'text-accent-800',
  };

  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      className={`group/ops relative flex flex-col gap-1 overflow-hidden rounded-xl border border-hairline bg-surface-subtle/80 p-3 text-left transition-all duration-200 ease-out ${
        onClick
          ? `hover:-translate-y-px hover:border-accent-200 hover:bg-white hover:shadow-hair ${FOCUS_RING}`
          : ''
      }`}
    >
      <span className={`absolute bottom-3 left-0 top-3 w-0.5 rounded-full ${edge[tone]}`} aria-hidden />
      <span className="pl-2.5 text-caption font-medium leading-tight text-ink-muted">{label}</span>
      <span className={`pl-2.5 text-heading font-semibold leading-none tabular-nums ${valueTone[tone]}`}>
        {value}
      </span>
      <span className="pl-2.5 truncate text-micro font-medium leading-tight text-ink-muted">{caption}</span>
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

  const { rows, days, total, step, busiest, busiestBand } = matrix;

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

  /* Band edges are printed rather than assumed, so the key always matches the grid. */
  const legend = [1, 2, 3, 4].map((level) => {
    const from = step * (level - 1) + 1;
    const to = step * level;
    return {
      level,
      dot: HEATMAP_LEVELS[level].dot,
      label: level === 4 ? `${from}+` : from === to ? `${from}` : `${from}–${to}`,
    };
  });

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
            className={`grid h-8 w-8 place-items-center rounded-full text-ink-muted transition-colors duration-200 ease-premium hover:bg-accent-50 hover:text-accent-800 ${FOCUS_RING}`}
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
          <span className="grid h-10 w-10 place-items-center rounded-full border border-accent-200 bg-white text-accent-700 shadow-hair">
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
                <span className={`h-2.5 w-2.5 shrink-0 rounded-[4px] ${item.dot}`} aria-hidden />
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
            {rows.map((row) => (
              <Fragment key={row.label}>
                <span className="pr-1.5 text-right text-micro font-medium leading-8 text-ink-muted">
                  {row.label}
                </span>
                {row.cells.map((cell) => (
                  <span
                    key={`${row.label}-${cell.day.dateLabel}`}
                    title={`${row.rangeLabel} · ${cell.day.label} ${cell.day.dateLabel} · ${cell.count} check-in${cell.count === 1 ? '' : 's'}`}
                    className={`h-8 rounded-md border border-white/60 shadow-[inset_0_0_0_1px_rgba(0,151,167,0.06)] transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_4px_12px_-4px_rgba(0,151,167,0.28)] ${HEATMAP_LEVELS[cell.level].cell}`}
                  />
                ))}
              </Fragment>
            ))}

            <span aria-hidden />
            {days.map((day) => (
              <span
                key={day.dateLabel}
                className={`truncate text-center text-micro font-medium ${
                  day.today ? 'text-accent-800' : 'text-ink-muted'
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
    <div className={CARD_TIERS.primary.shell}>
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
        {/*
          Coverage visualization — exact 50/50: layered circular analytics | legend.
        */}
        <div className="grid grid-cols-1 items-center gap-6 md:gap-8 md:[grid-template-columns:1fr_1fr]">
          <div className="flex min-h-[16rem] items-center justify-center px-1 py-1 sm:min-h-[17.5rem]">
            <LayeredAttendanceViz
              onSite={values.onSite}
              remote={values.remote}
              absent={absent}
              headcount={headcount}
              coverage={coverage}
              activeKey={hoverKey}
              onHoverKey={setHoverKey}
            />
          </div>

          <div className="flex min-h-[14rem] items-center px-1 sm:min-h-[17.5rem] sm:px-2">
            <AttendanceSegmentLegend
              segments={segments}
              headcount={headcount}
              activeKey={hoverKey}
              onHoverKey={setHoverKey}
              reveal={legendReady}
            />
          </div>
        </div>

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

        <div className="flex flex-1 flex-col border-t border-hairline pt-4">
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
    <div className={CARD_TIERS.secondary.shell}>
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
                  className="group/item rounded-xl border border-hairline bg-white p-4 transition-all duration-200 ease-out hover:border-accent-200 hover:bg-accent-50/40 hover:shadow-hair"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-accent-200 bg-accent-50 text-label font-semibold uppercase text-accent-800"
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

                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-micro font-semibold ${item.badgeClass}`}>
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
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-warning-solid/25 bg-warning-solid/10 px-2 py-0.5 text-micro font-semibold tracking-tight text-warning-ink">
                          <AlertCircle className="h-3 w-3 shrink-0 text-warning-solid" strokeWidth={2.5} aria-hidden />
                          {item.urgent}
                        </span>
                      )}
                    </div>
                  )}

                  {item.reason && (
                    <p className="mt-2 line-clamp-2 rounded-lg border-l-2 border-accent-600 bg-accent-50/50 px-3 py-2 text-caption italic leading-relaxed text-ink-muted">
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
                className={`font-semibold text-accent-800 underline decoration-accent-200 underline-offset-4 transition-colors hover:decoration-accent-700 ${FOCUS_RING}`}
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
              className={`font-semibold text-accent-800 underline decoration-accent-200 underline-offset-4 transition-colors hover:decoration-accent-700 ${FOCUS_RING}`}
            >
              Batch approve
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={onOpen}
            className={`font-semibold text-accent-800 underline decoration-accent-200 underline-offset-4 transition-colors hover:decoration-accent-700 ${FOCUS_RING}`}
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
    { label: 'On shift', value: presentCount, dot: 'bg-accent-600' },
    { label: 'On leave', value: onLeaveCount, dot: 'bg-warning-solid' },
    { label: 'Off duty', value: offDutyCount, dot: 'bg-ink-faint' },
  ];

  return (
    <article className={`${CARD_TIERS.utility.shell} print:break-inside-avoid`}>
      <CardHeader
        tier="utility"
        title="Directory snapshot"
        meta={loading ? undefined : `${presentCount} of ${directoryRows.length} on shift now`}
        action={<GhostAction onClick={() => navigate('/users')}>View all</GhostAction>}
      />

      {!loading && directoryRows.length > 0 && (
        <div className={`ui-inset ${CARD_TIERS.utility.gap} flex items-center justify-between gap-4 px-3 py-2`}>
          {statusSplit.map((entry) => (
            <span key={entry.label} className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${entry.dot}`} aria-hidden />
              <span className="text-caption font-medium text-ink-muted">{entry.label}</span>
              <span className="text-label font-semibold tabular-nums text-ink">{entry.value}</span>
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
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-100 text-micro font-semibold uppercase leading-none text-accent-800">
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
                    className="h-3.5 w-3.5 shrink-0 text-ink-faint opacity-0 transition-all duration-fast ease-premium group-hover/row:translate-x-0.5 group-hover/row:opacity-100"
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
          Checked in <strong className="font-semibold text-ink">{presentCount}</strong>
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
    <div className={CARD_TIERS.secondary.shell}>
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
          <div className="rounded-xl border border-hairline bg-surface-subtle/80 px-3 py-2.5">
            <p className="truncate text-micro font-medium text-ink-muted">This month</p>
            <p className="mt-1 text-subheading font-semibold tabular-nums text-ink">
              {formatNumber(latest?.checkins || 0)}
            </p>
          </div>
          <div className="rounded-xl border border-hairline bg-surface-subtle/80 px-3 py-2.5">
            <p className="truncate text-micro font-medium text-ink-muted">Monthly average</p>
            <p className="mt-1 text-subheading font-semibold tabular-nums text-ink">{formatNumber(monthlyAverage)}</p>
          </div>
          <div className="rounded-xl border border-hairline bg-surface-subtle/80 px-3 py-2.5">
            <p className="truncate text-micro font-medium text-ink-muted">Busiest month</p>
            <p className="mt-1 truncate text-subheading font-semibold text-ink">
              {busiest?.checkins ? busiest.label : '—'}
            </p>
          </div>
        </div>
      )}

      <div className={cardFooter('secondary')}>
        <span className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2">
            {/* Legend dots track CHART_COLORS.primary / .tertiary exactly. */}
            <span className="h-2 w-2 rounded-full bg-accent-600" aria-hidden />
            Check-ins
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent-800" aria-hidden />
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
    dot: '#0097A7',
    label: 'Check-in',
    icon: LogIn,
    chip: 'bg-accent-100 text-accent-800',
    glow: 'shadow-[0_0_0_3px_rgba(0,151,167,0.22)]',
  },
  checkout: { dot: '#006978', label: 'Check-out', icon: LogOut, chip: 'bg-accent-50 text-accent-800' },
  manual: { dot: '#F59E0B', label: 'Manual override', icon: PenLine, chip: 'bg-warning-surface text-warning-ink' },
  leave: { dot: '#4DD0E1', label: 'Leave', icon: CalendarDays, chip: 'bg-accent-50 text-accent-800' },
  user: { dot: '#94A3B8', label: 'Profile update', icon: UserCog, chip: 'bg-surface-muted text-[#475569]' },
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
    <div className={CARD_TIERS.utility.shell}>
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
              <div key={entry.key} className="ui-inset px-3 py-2">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.dot }} aria-hidden />
                  <span className="truncate text-micro font-medium text-ink-muted">{entry.label}</span>
                </span>
                <span className="mt-1 block text-subheading font-semibold tabular-nums text-ink">{entry.value}</span>
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
                <span className="h-px flex-1 bg-hairline" aria-hidden />
              </p>

              <ul className="relative">
                {/* Continuous rail behind the dots ties the group into one thread. */}
                <span className="absolute bottom-3 left-[3.75rem] top-3 w-px bg-hairline" aria-hidden />

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
                        <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-100 text-micro font-semibold uppercase leading-none text-accent-800">
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
    <div className={CARD_TIERS.secondary.shell}>
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
                className="rounded-xl border border-hairline bg-white px-4 py-3 transition-all duration-200 ease-out hover:-translate-y-px hover:border-accent-200 hover:bg-accent-50/40 hover:shadow-hair"
              >
                <div className="flex items-center gap-3">
                  {/* Manager avatar doubles as the department's colour key. */}
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-micro font-semibold uppercase leading-none text-white"
                    style={{ backgroundColor: bar.color }}
                    aria-hidden
                  >
                    {getInitials(bar.manager || bar.label)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-label font-semibold leading-tight text-ink">{bar.label}</p>
                    <p className="mt-0.5 truncate text-micro leading-tight text-ink-muted">
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
                    <span className="text-subheading font-semibold tabular-nums text-ink">{bar.total}</span>
                  </div>
                </div>

                {/* Headcount share reads as the bar; today's attendance sits beside it. */}
                <div className="ui-track mt-3 h-1.5">
                  <div
                    className="ui-track-fill"
                    style={{ width: `${bar.width}%`, backgroundColor: bar.color }}
                  />
                </div>

                <div className="mt-2 flex items-center justify-between gap-4 text-micro tabular-nums text-ink-muted">
                  <span>{bar.percentage}% of workforce</span>
                  <span>
                    <strong className="font-semibold text-ink">{bar.attendance}%</strong> in today
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={cardFooter('secondary')}>
        <span>
          Active departments <strong className="font-semibold text-ink">{activeDepartments}</strong>
        </span>
        <span>
          Unassigned <strong className="font-semibold text-ink">{unassigned}</strong>
        </span>
      </div>
    </div>
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
   * Operational read on today: who arrived late and who never closed a shift.
   * Everything here comes from recorded attendance events — nothing is estimated.
   */
  const todayOps = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const firstCheckin = new Map();
    /* Last event per employee per past day decides whether a shift was closed. */
    const priorDays = new Map();
    const window = Date.now() - 7 * 86400000;

    for (const row of attendance) {
      if (!row.timestamp) continue;
      const stamp = new Date(row.timestamp);
      if (Number.isNaN(stamp.getTime())) continue;
      const type = normalizeAttendanceType(row.type);
      const key = attendanceUserKey(row);

      if (stamp >= startOfToday) {
        if (type !== 'checkin') continue;
        const seen = firstCheckin.get(key);
        if (!seen || stamp < seen) firstCheckin.set(key, stamp);
        continue;
      }

      if (stamp.getTime() < window) continue;
      const dayKey = `${key}|${stamp.getFullYear()}-${stamp.getMonth()}-${stamp.getDate()}`;
      const entry = priorDays.get(dayKey);
      if (!entry || stamp > entry.stamp) priorDays.set(dayKey, { stamp, type });
    }

    let late = 0;
    for (const stamp of firstCheckin.values()) {
      if (stamp.getHours() * 60 + stamp.getMinutes() > LATE_AFTER_MINUTES) late += 1;
    }

    let openShifts = 0;
    for (const entry of priorDays.values()) {
      if (entry.type !== 'checkout') openShifts += 1;
    }

    return { late, openShifts, checkedInKeys: new Set(firstCheckin.keys()) };
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

    /* Integer step with a floor of 1, so the four bands never collapse onto the same
       range on a quiet week. */
    const step = Math.max(1, Math.ceil(peak / 4));
    const levelOf = (count) => (count === 0 ? 0 : Math.min(4, Math.ceil(count / step)));

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

  /* Seven-day series behind the KPI day-over-day chips, derived from recorded events. */
  const dailyTrend = useMemo(() => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 6; i >= 0; i -= 1) {
      const start = new Date(midnight);
      start.setDate(midnight.getDate() - i);
      const end = new Date(start);
      end.setDate(start.getDate() + 1);
      days.push({ start, end, present: new Set(), remote: new Set(), requests: 0, headcount: 0 });
    }
    const bucketFor = (stamp) => days.find((day) => stamp >= day.start && stamp < day.end);

    for (const row of attendance) {
      if (!row.timestamp || normalizeAttendanceType(row.type) !== 'checkin') continue;
      const stamp = new Date(row.timestamp);
      if (Number.isNaN(stamp.getTime())) continue;
      const day = bucketFor(stamp);
      if (!day) continue;
      const key = attendanceUserKey(row);
      const mode = String(usersByKey.get(key)?.work_mode || 'in_office').toLowerCase();
      day.present.add(key || `present-${day.present.size}`);
      if (REMOTE_MODES.has(mode)) day.remote.add(key || `remote-${day.remote.size}`);
    }

    for (const leave of leaves) {
      const raw = leave.requested_at || leave.created_at;
      if (!raw) continue;
      const stamp = new Date(raw);
      if (Number.isNaN(stamp.getTime())) continue;
      const day = bucketFor(stamp);
      if (day) day.requests += 1;
    }

    for (const day of days) {
      day.headcount = cachedUsers.filter((row) => {
        if (!row.created_at) return false;
        const created = new Date(row.created_at);
        return !Number.isNaN(created.getTime()) && created < day.end;
      }).length;
    }

    return {
      remote: days.map((day) => day.remote.size),
      requests: days.map((day) => day.requests),
      rate: days.map((day) => (day.headcount ? Math.round((day.present.size / day.headcount) * 100) : 0)),
      headcount: days.map((day) => day.headcount),
    };
  }, [attendance, leaves, cachedUsers, usersByKey]);

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
        badgeClass: 'bg-accent-100 text-accent-800',
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
        badgeClass: 'bg-warning-surface text-warning-ink',
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
        badgeClass: 'bg-danger-surface text-danger-ink',
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

  const hasTrendData = useMemo(
    () => attendanceTrend.some((point) => point.checkins > 0 || point.headcount > 0),
    [attendanceTrend]
  );

  const totalUsers = stats?.totalEmployees ?? cachedUsers.length;
  const activeUsers = stats?.activeUsers ?? cachedUsers.filter((row) => row.is_active).length;
  const pendingApprovals = stats?.pendingLeaves ?? pendingLeaves.length;
  const attendanceRate = activeUsers
    ? Math.min(100, Math.round((attendanceToday.uniqueCheckins / activeUsers) * 100))
    : 0;
  const adminName = toTitleCaseName(user?.name?.split(' ')[0] || user?.username || 'Admin');

  /* Month-over-month movement for the trend card's pill. */
  const monthDelta =
    attendanceTrend.length > 1
      ? attendanceTrend[attendanceTrend.length - 1].checkins - attendanceTrend[attendanceTrend.length - 2].checkins
      : null;

  /* Age of the longest-waiting request, so the queue KPI can carry urgency. */
  const oldestPending = useMemo(() => {
    const stamps = [...pendingLeaves, ...pendingWorkModes]
      .map((row) => new Date(row.requested_at || row.created_at || 0).getTime())
      .filter((time) => Number.isFinite(time) && time > 0);
    if (!stamps.length) return { days: null, label: null };
    const days = Math.floor((Date.now() - Math.min(...stamps)) / 86400000);
    return {
      days,
      label: days >= 1 ? `Oldest waiting ${days} day${days === 1 ? '' : 's'}` : 'Oldest waiting under a day',
    };
  }, [pendingLeaves, pendingWorkModes]);

  const remoteShare = attendanceToday.uniqueCheckins
    ? Math.round((attendanceToday.remote / attendanceToday.uniqueCheckins) * 100)
    : 0;

  const deactivated = Math.max(totalUsers - activeUsers, 0);
  const roster = useMemo(() => {
    const departments = new Set();
    let unassigned = 0;
    for (const row of cachedUsers) {
      if (row.department) departments.add(row.department);
      else unassigned += 1;
    }
    return { departmentCount: departments.size, unassigned };
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
  const mean = (series) =>
    series.length ? Math.round(series.reduce((sum, entry) => sum + entry, 0) / series.length) : 0;
  const remoteWeekAvg = mean(dailyTrend.remote);
  const requestsThisWeek = dailyTrend.requests.reduce((sum, entry) => sum + entry, 0);
  const plural = (count, word) => `${formatNumber(count)} ${word}${count === 1 ? '' : 's'}`;

  /*
   * Each KPI answers three things in a fixed order: the number, what it is made of
   * (`context`), and what to do about it (`insight`). The insight is the line that
   * turns a metric into an instruction, so it names a consequence — never "no change"
   * or "flat", which tell the reader nothing.
   */
  const overviewStats = [
    {
      icon: Users,
      label: 'Total workforce',
      count: totalUsers,
      context: `${plural(activeUsers, 'active employee')} · ${formatNumber(deactivated)} deactivated`,
      detail: `${formatNumber(onShiftKeys.size)} on shift now · ${plural(roster.departmentCount, 'department')}`,
      insight:
        deactivated > 0
          ? `${plural(deactivated, 'account')} deactivated — review access`
          : roster.unassigned > 0
            ? `${plural(roster.unassigned, 'employee')} without a department`
            : `Every employee assigned across ${plural(roster.departmentCount, 'department')}`,
      insightTone: deactivated > 0 || roster.unassigned > 0 ? 'watch' : 'good',
      onClick: canViewUsers ? () => navigate('/users') : undefined,
    },
    {
      icon: CalendarCheck,
      label: 'Attendance rate',
      count: attendanceRate,
      suffix: '%',
      context: `${formatNumber(attendanceToday.uniqueCheckins)} of ${formatNumber(activeUsers)} checked in today`,
      progress: attendanceRate,
      insight:
        attendanceToday.uniqueCheckins === 0
          ? 'No check-ins recorded yet today'
          : todayOps.late > 0
            ? `${plural(todayOps.late, 'arrival')} after ${LATE_LABEL}`
            : todayOps.openShifts > 0
              ? `${plural(todayOps.openShifts, 'shift')} left open this week`
              : 'Everyone in on time today',
      insightTone:
        attendanceToday.uniqueCheckins === 0
          ? 'neutral'
          : todayOps.late > 0 || todayOps.openShifts > 0
            ? 'watch'
            : 'good',
      onClick: canViewAttendance ? () => navigate('/attendance') : undefined,
    },
    {
      icon: Wifi,
      label: 'Remote / hybrid',
      count: attendanceToday.remote,
      context: `${formatNumber(attendanceToday.onSite)} on-site · ${remoteShare}% of today's check-ins`,
      insight:
        attendanceToday.uniqueCheckins === 0
          ? 'Waiting on today’s first check-in'
          : attendanceToday.remote === 0
            ? 'Whole team on-site today'
            : `Averaging ${formatNumber(remoteWeekAvg)} remote per day this week`,
      insightTone: 'neutral',
      onClick: canViewWorkModes ? () => navigate('/work-mode-requests') : undefined,
    },
    {
      icon: Clock,
      label: 'Pending approvals',
      count: pendingApprovals,
      context: `${formatNumber(pendingCounts.leaves)} leave · ${formatNumber(pendingCounts.workModes)} work-mode`,
      insight:
        pendingApprovals === 0
          ? 'Queue is clear — nothing waiting on a decision'
          : oldestPending.days != null && oldestPending.days >= 2
            ? `${oldestPending.label} — decide today`
            : requestsThisWeek > 0
              ? `${plural(requestsThisWeek, 'request')} arrived this week`
              : `${plural(pendingApprovals, 'request')} waiting on review`,
      insightTone:
        pendingApprovals === 0
          ? 'good'
          : oldestPending.days != null && oldestPending.days >= 3
            ? 'urgent'
            : 'watch',
      onClick: canViewLeaves ? () => navigate('/leaves') : undefined,
    },
  ];

  return (
    <div className="dashboard-page animate-fade-up space-y-8">
      <OverviewBanner
        adminName={adminName}
        stats={overviewStats}
        loading={loading}
        statusPills={[
          { label: 'System synced' },
          ...(onShiftKeys.size > 0 ? [{ label: `${onShiftKeys.size} on shift` }] : []),
        ]}
      />

      {error && (
        <div role="alert" className="rounded-xl border border-danger-border bg-danger-surface px-4 py-3">
          <p className="text-sm font-medium text-danger-ink">{error}</p>
        </div>
      )}

      {/*
        Visual hierarchy: primary ops (8) + live feed (4) → action inbox (5) + departments (7)
        → analytics trend (7) + directory (5).
      */}
      <div className="grid grid-cols-1 items-stretch gap-5 sm:gap-6 lg:grid-cols-12">
        {loading ? (
          <div className={`${CARD} skeleton h-[32rem] lg:col-span-8`} aria-hidden />
        ) : (
          <div className="lg:col-span-8">
            <AttendanceOpsCard
              metrics={attendanceRanges}
              headcount={activeUsers}
              onShiftNow={onShiftKeys.size}
              ops={todayOps}
              heatmap={checkinHeatmap}
              onLeaveCount={onLeaveKeys.size}
              onOpen={() => navigate('/attendance')}
              onOpenLeaves={canViewLeaves ? () => navigate('/leaves') : undefined}
              onRefresh={() => loadDashboard(true)}
            />
          </div>
        )}

        <div className="lg:col-span-4">
          <ActivityTimelineCard
            loading={loading}
            items={activityItems}
            lastEventLabel={activityItems[0]?.time || '—'}
            onOpen={canViewAttendance ? () => navigate('/attendance') : undefined}
          />
        </div>

        <div className="lg:col-span-5">
          <ActionQueueCard
            items={actionQueue}
            approvableCount={approvableCount}
            busyId={queueBusyId}
            batching={batching}
            onBatchApprove={batchApprove}
            onOpen={() => navigate(canViewLeaves ? '/leaves' : '/tickets')}
          />
        </div>

        {canViewUsers && (
          <div className="lg:col-span-7">
            <DepartmentBreakdownCard
              rows={departmentRows}
              loading={loading}
              navigate={navigate}
              canManage={canManageDepartments}
            />
          </div>
        )}

        {canViewAttendance && (
          <div className="lg:col-span-7">
            <AttendanceTrendCard
              loading={loading}
              data={attendanceTrend}
              isEmpty={!hasTrendData}
              monthDelta={monthDelta}
              onViewAttendance={() => navigate('/attendance')}
            />
          </div>
        )}

        {canViewUsers && (
          <div className="lg:col-span-5">
            <DirectorySnapshotCard
              loading={loading}
              directoryRows={cachedUsers.slice(0, 8)}
              onLeaveKeys={onLeaveKeys}
              checkedInKeys={onShiftKeys}
              navigate={navigate}
            />
          </div>
        )}
      </div>

      {/* Compact directory and headcount summary. */}
      {canViewUsers && !loading && (
        <p className="flex flex-wrap items-center gap-2 text-caption font-medium text-ink-muted">
          <Building2 className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden />
          {departmentRows.length} department{departmentRows.length === 1 ? '' : 's'} tracked
          <span aria-hidden>·</span>
          {`${formatNumber(activeUsers)} active accounts`}
        </p>
      )}
    </div>
  );
}
