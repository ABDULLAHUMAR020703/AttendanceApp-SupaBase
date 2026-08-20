import { cn } from '../../lib/cn';

const TONES = {
  neutral: 'ui-badge-neutral',
  accent: 'ui-badge-accent',
  violet: 'ui-badge-violet',
  success: 'ui-badge-success',
  warning: 'ui-badge-warning',
  danger: 'ui-badge-danger',
};

/** Legacy variant names kept so existing call sites keep resolving. */
const TONE_ALIASES = {
  default: 'neutral',
  muted: 'neutral',
  primary: 'accent',
  info: 'accent',
  error: 'danger',
};

const DOTS = {
  neutral: 'bg-slate-400',
  accent: 'bg-sky-500',
  violet: 'bg-violet-500',
  success: 'bg-emerald-500',
  warning: 'bg-warning-solid',
  danger: 'bg-danger-solid',
};

/**
 * The workforce status vocabulary, in one place so the same word never renders in
 * two different colours on two different screens.
 *
 * Tone assignment follows meaning, not sentiment: green is "settled and correct",
 * cyan is "a valid non-default arrangement" (remote, hybrid), amber is "waiting on
 * someone", red is "needs intervention", grey is "not in play".
 */
const STATUS_TONES = {
  // settled
  active: 'success',
  approved: 'success',
  present: 'success',
  completed: 'success',
  sent: 'success',
  resolved: 'success',
  verified: 'success',
  'checked in': 'accent',
  'checked out': 'accent',
  'on-site': 'accent',
  'on site': 'accent',
  onsite: 'accent',
  in_office: 'accent',
  'in office': 'accent',

  // valid alternative arrangement
  remote: 'accent',
  hybrid: 'accent',
  geofenced: 'accent',
  open: 'accent',
  new: 'accent',
  scheduled: 'accent',
  in_progress: 'accent',
  'in progress': 'accent',

  // waiting on a person
  pending: 'warning',
  late: 'warning',
  'half day': 'warning',
  'on leave': 'warning',
  review: 'warning',
  'in review': 'warning',
  awaiting: 'warning',
  skipped: 'warning',
  escalated: 'warning',

  // needs intervention
  rejected: 'danger',
  declined: 'danger',
  absent: 'danger',
  overdue: 'danger',
  failed: 'danger',
  expired: 'danger',
  unverified: 'danger',
  breach: 'danger',

  // not in play
  inactive: 'neutral',
  disabled: 'neutral',
  closed: 'neutral',
  cancelled: 'neutral',
  archived: 'neutral',
  draft: 'neutral',
  not_sent: 'neutral',
  'not sent': 'neutral',
  'off duty': 'neutral',
  unknown: 'neutral',
};

/** Roles are a separate axis: seniority reads through weight, not through alarm. */
const ROLE_TONES = {
  super_admin: 'violet',
  admin: 'violet',
  manager: 'accent',
  employee: 'neutral',
};

const normalize = (value) => String(value ?? '').trim().toLowerCase();

export function badgeToneForStatus(status) {
  return STATUS_TONES[normalize(status)] || 'neutral';
}

/** `pending_approval` / `on-site` → `Pending approval` / `On-site`. */
export function formatStatusLabel(status) {
  const raw = String(status ?? '').trim();
  if (!raw) return '';
  const spaced = raw.replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

function resolveTone({ tone, variant, status }) {
  const named = tone || variant;
  if (named) return TONES[named] ? named : TONE_ALIASES[named] || 'neutral';
  return status ? badgeToneForStatus(status) : 'neutral';
}

export function Badge({ tone, variant, status, dot = false, size, className = '', children }) {
  const toneKey = resolveTone({ tone, variant, status });

  return (
    <span className={cn('ui-badge', TONES[toneKey], size === 'lg' && 'ui-badge-lg', className)}>
      {dot && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOTS[toneKey])} aria-hidden />}
      {children ?? status}
    </span>
  );
}

/**
 * Status chip for raw values off the API. Takes `pending_approval` and renders a
 * correctly toned, correctly cased badge, so pages stop keeping private colour maps.
 */
export function StatusBadge({ status, dot = true, size, className = '', label }) {
  return (
    <Badge tone={badgeToneForStatus(status)} dot={dot} size={size} className={className}>
      {label ?? formatStatusLabel(status) ?? '—'}
    </Badge>
  );
}

/** Role chip. Kept distinct from status so a role never borrows a status colour. */
export function RoleBadge({ role, className = '' }) {
  const tone = ROLE_TONES[normalize(role)] || 'neutral';
  return (
    <Badge tone={tone} className={className}>
      {formatStatusLabel(role) || 'Employee'}
    </Badge>
  );
}
