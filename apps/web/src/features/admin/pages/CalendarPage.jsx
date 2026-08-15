import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarPlus, ChevronLeft, ChevronRight, Clock3, Plus, Search, Users, X } from 'lucide-react';
import { PermissionGate, useAnyPermission } from '../../../shared/components/PermissionGate';
import { adminService } from '../services/adminService';
import { PERMISSIONS } from '../permissions';
import { SlideOverPanel } from '../../../shared/components/SlideOverPanel';
import { useSilentPoll, useSessionState } from '../../../shared/hooks/useSilentPoll';
import { EmptyStateBody } from '../../../shared/components/ui/EmptyState';
import { SkeletonFeed } from '../../../shared/components/ui/Skeleton';
import { DatePickerField, TimePickerField } from './calendarPickers';
import { formatEmployeeDisplay, formatLeaveStatus, formatLeaveTypeLabel } from '../utils/leaveDisplay';
import { normalizeAttendanceType } from '../utils/analyticsCharts';

const RAIL = '#00B0FF';
const SIDEBAR_GRADIENT = 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)';

const EVENT_TYPES = [
  { value: 'reminder', label: 'Reminder' },
  { value: 'meeting', label: 'Event' },
  { value: 'holiday', label: 'Holiday' },
  { value: 'other', label: 'Other' },
];

const EVENT_DASH = {
  meeting: '#00B0FF',
  reminder: '#70C8F4',
  holiday: '#F59E0B',
  other: '#F59E0B',
};

const AVATAR_TONES = ['#00B0FF', '#70C8F4', '#0094BE'];

const GRID_LINE = 'rgba(136, 152, 170, 0.18)';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MINI_WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const TIMELINE_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIMELINE_START = 8;
const TIMELINE_END = 18;
const HOUR_HEIGHT = 68;
const TIMELINE_HOURS = Array.from({ length: TIMELINE_END - TIMELINE_START + 1 }, (_, index) => TIMELINE_START + index);
const TIMELINE_MINUTES = (TIMELINE_END - TIMELINE_START) * 60;
const TIMELINE_HEIGHT = (TIMELINE_END - TIMELINE_START) * HOUR_HEIGHT;

const emptyForm = {
  title: '',
  description: '',
  date: '',
  time: '',
  type: 'meeting',
  visibility: 'all',
};

const pad = (value) => String(value).padStart(2, '0');
const toDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const inputClass =
  'mt-1.5 w-full min-w-0 rounded-xl border border-slate-200 bg-[#F0F9FD] px-3 py-2.5 text-sm font-medium text-slate-800 placeholder:text-[#8898AA] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] [&::-webkit-calendar-picker-indicator]:opacity-0 focus:border-[#00B0FF] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#70C8F4]/30';

function parseDate(value) {
  if (!value) return null;
  const raw = String(value).split('T')[0];
  const [year, month, day] = raw.split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatMonthLabel(date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function formatDayLabel(date) {
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

function timeLabel(event) {
  const raw = String(event.time || '').trim();
  if (!raw) return 'All day';
  const match = /^(\d{1,2}):(\d{2})/.exec(raw);
  if (!match) return raw;
  return `${pad(Number(match[1]))}:${match[2]}`;
}

function validateEvent(form) {
  if (!form.title?.trim()) return 'Title is required';
  if (!form.date) return 'Date is required';
  if (form.date && !/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return 'Date must be YYYY-MM-DD';
  return null;
}

function buildMonthCells(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      key: toDateKey(date),
      inMonth: date.getMonth() === monthDate.getMonth(),
    };
  });
}

function startOfWorkWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + mondayOffset);
  d.setHours(0, 0, 0, 0);
  return d;
}

function buildTimelineDays(selectedDate, view) {
  const selected = parseDate(selectedDate) || new Date();
  if (view === 'day') {
    return [{
      label: WEEKDAYS[selected.getDay()],
      short: WEEKDAYS[selected.getDay()],
      date: selected,
      key: toDateKey(selected),
    }];
  }
  const start = startOfWorkWeek(selected);
  return Array.from({ length: 5 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      label: TIMELINE_DAYS[index],
      short: WEEKDAYS[date.getDay()],
      date,
      key: toDateKey(date),
    };
  });
}

function normalizeEvent(event) {
  const date = parseDate(event.date);
  return {
    ...event,
    dateKey: date ? toDateKey(date) : String(event.date || '').split('T')[0],
  };
}

function eventStartMinutes(event, fallbackIndex = 0) {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)/.exec(String(event.time || ''));
  if (!match) return (TIMELINE_START + 1 + (fallbackIndex % 7)) * 60;
  return Number(match[1]) * 60 + Number(match[2]);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function formatWorkMode(value) {
  const mode = String(value || 'in_office').toLowerCase().replace(/-/g, '_');
  const labels = {
    in_office: 'In office',
    office: 'In office',
    remote: 'Remote',
    fully_remote: 'Remote',
    hybrid: 'Hybrid',
    semi_remote: 'Hybrid',
  };
  return labels[mode] || String(value || 'Unknown').replace(/_/g, ' ');
}

function employeeName(row) {
  return row?.employee?.name || row?.employee_name || row?.employeeName || row?.name || row?.username || row?.employee_uid || row?.user_uid || 'Employee';
}

function attendanceDateKey(row) {
  if (!row?.timestamp) return '';
  const date = new Date(row.timestamp);
  return Number.isNaN(date.getTime()) ? '' : toDateKey(date);
}

function workModeDateKey(row) {
  const raw = row?.effective_date || row?.requested_date || row?.created_at || row?.createdAt;
  if (!raw) return '';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? '' : toDateKey(date);
}

function normalizeStatus(value) {
  return String(value || 'pending').toLowerCase();
}

function leaveCoversDate(leave, dateKey) {
  const start = parseDate(leave?.start_date);
  const end = parseDate(leave?.end_date);
  const day = parseDate(dateKey);
  if (!start || !end || !day) return false;
  return startOfDay(start) <= startOfDay(day) && startOfDay(end) >= startOfDay(day);
}

function formatStamp(iso) {
  if (!iso) return 'All day';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'All day';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function daySummary({ dateKey, events = [], attendanceRows = [], leaveRows = [], workModeRows = [], users = [] }) {
  const dayEvents = events.filter((event) => event.dateKey === dateKey);
  const dayAttendance = attendanceRows.filter((row) => attendanceDateKey(row) === dateKey);
  const dayLeaves = leaveRows.filter((row) => leaveCoversDate(row, dateKey));
  const dayWorkModes = workModeRows.filter((row) => workModeDateKey(row) === dateKey);
  const holidays = dayEvents.filter((event) => event.type === 'holiday');
  const approvedLeaves = dayLeaves.filter((row) => normalizeStatus(row.status) === 'approved');
  const pendingLeaves = dayLeaves.filter((row) => normalizeStatus(row.status) === 'pending');
  const checkins = dayAttendance.filter((row) => normalizeAttendanceType(row.type) === 'checkin');
  const checkouts = dayAttendance.filter((row) => normalizeAttendanceType(row.type) === 'checkout');
  const workModes = users.reduce((counts, user) => {
    if (user?.is_active === false) return counts;
    const mode = formatWorkMode(user.work_mode || user.workMode || 'in_office');
    counts[mode] = (counts[mode] || 0) + 1;
    return counts;
  }, {});

  return {
    dateKey,
    events: dayEvents,
    holidays,
    attendance: dayAttendance,
    checkins,
    checkouts,
    leaves: dayLeaves,
    approvedLeaves,
    pendingLeaves,
    workModeRequests: dayWorkModes,
    workModes,
    hasData: dayEvents.length > 0 || dayAttendance.length > 0 || dayLeaves.length > 0 || dayWorkModes.length > 0 || Object.keys(workModes).length > 0,
  };
}

function TimelineEventCard({ event, index, onClick, compact = false }) {
  const dash = EVENT_DASH[event.type] || EVENT_DASH.other;
  const start = eventStartMinutes(event, index);
  const duration = event.type === 'holiday' ? 80 : event.type === 'meeting' ? 95 : 70;
  const top = clamp(((start - TIMELINE_START * 60) / TIMELINE_MINUTES) * TIMELINE_HEIGHT, 10, TIMELINE_HEIGHT - 92);
  const height = clamp((duration / 60) * HOUR_HEIGHT, 88, 128);
  const avatarCount = event.type === 'reminder' ? 1 : event.type === 'holiday' ? 2 : 3;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`calendar-card absolute z-[1] flex flex-col items-start rounded-2xl bg-white px-4 py-3.5 text-left transition-all duration-200 ${compact ? 'left-4 w-[min(36rem,calc(100%-2rem))]' : 'inset-x-2'}`}
      style={{ top, minHeight: height }}
    >
      <span className="mb-2 block h-1 w-6 rounded-full" style={{ backgroundColor: dash }} aria-hidden />
      <span className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-slate-800">{event.title}</span>
      <span className="mt-auto flex w-full items-center justify-between gap-2 pt-2">
        <span className="text-xs font-medium text-[#8898AA]">{timeLabel(event)}</span>
        <span className="flex -space-x-1.5" aria-hidden>
          {Array.from({ length: avatarCount }, (_, avatar) => (
            <span
              key={avatar}
              className="h-6 w-6 rounded-full border-2 border-white"
              style={{ backgroundColor: AVATAR_TONES[avatar % AVATAR_TONES.length] }}
            />
          ))}
        </span>
      </span>
    </button>
  );
}

function MiniCalendar({ monthDate, selectedDate, eventDays, onSelect, onShiftMonth }) {
  const cells = useMemo(() => buildMonthCells(monthDate), [monthDate]);
  const selectedKey = selectedDate || '';

  return (
    <div className="px-1 py-1 text-slate-800">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold tracking-tight">{formatMonthLabel(monthDate)}</p>
        <div className="flex gap-1">
          <button type="button" onClick={() => onShiftMonth(-1)} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-[#00B0FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B0FF]/30" aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" onClick={() => onShiftMonth(1)} className="grid h-8 w-8 place-items-center rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-[#00B0FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B0FF]/30" aria-label="Next month">
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
      <div className="mb-2 grid grid-cols-7 text-center text-[10px] font-bold tracking-[0.08em] text-slate-400">
        {MINI_WEEKDAYS.map((day, index) => <span key={`${day}-${index}`} className="py-1">{day}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-[12px]">
        {cells.map((cell) => {
          const active = cell.key === selectedKey;
          const hasEvent = eventDays.has(cell.key);
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelect(cell.key)}
              className={`relative mx-auto flex h-8 w-8 flex-col items-center justify-center rounded-full font-bold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B0FF]/30 ${
                active
                  ? 'bg-[#00B0FF] text-white shadow-sm'
                  : cell.inMonth
                    ? 'text-slate-700 hover:bg-slate-100'
                    : 'text-slate-300 hover:bg-slate-100'
              }`}
            >
              <span className="leading-none">{cell.date.getDate()}</span>
              {hasEvent && (
                <span
                  className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#00B0FF]"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TypeDot({ tone, label }) {
  const tones = {
    attendance: 'bg-emerald-500',
    leave: 'bg-sky-500',
    holiday: 'bg-amber-500',
    work: 'bg-violet-400',
    event: 'bg-[#00B0FF]',
  };
  return <span className={`h-1.5 w-1.5 rounded-full ${tones[tone] || tones.event}`} title={label} aria-label={label} />;
}

function MonthGrid({ monthDate, selectedDate, eventsByDay, summariesByDay, onSelect, onOpenEvent, onOpenDay }) {
  const cells = useMemo(() => buildMonthCells(monthDate), [monthDate]);
  const todayKey = toDateKey(new Date());

  return (
    <div className="grid min-h-0 flex-1 grid-cols-7 overflow-hidden rounded-2xl border border-[#E8F0F5] bg-white">
      {WEEKDAYS.map((day, index) => (
        <div key={`${day}-${index}`} className="border-b border-[#E8F0F5] bg-slate-50 px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
          {day}
        </div>
      ))}
      {cells.map((cell) => {
        const dayEvents = eventsByDay.get(cell.key) || [];
        const summary = summariesByDay.get(cell.key) || {};
        const active = cell.key === selectedDate;
        const isToday = cell.key === todayKey;
        const hasAttendance = (summary.checkins?.length || 0) > 0;
        const hasLeave = (summary.leaves?.length || 0) > 0;
        const hasHoliday = (summary.holidays?.length || 0) > 0;
        const hasWork = (summary.workModeRequests?.length || 0) > 0;
        return (
          <button
            key={cell.key}
            type="button"
            onClick={() => onOpenDay(cell.key)}
            className={`group flex min-h-[108px] flex-col items-start gap-1.5 overflow-hidden border-b border-r border-[#E8F0F5] p-2 text-left transition hover:bg-slate-50/80 ${active ? 'bg-[#F0FAFF]' : cell.inMonth ? 'bg-white' : 'bg-slate-50/70'}`}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${
                active ? 'bg-[#00B0FF] text-white' : isToday ? 'border border-[#00B0FF]/40 bg-white text-[#0284C7]' : cell.inMonth ? 'text-slate-800' : 'text-slate-300'
              }`}>
                {cell.date.getDate()}
              </span>
              <span className="flex items-center gap-1" aria-hidden>
                {hasAttendance && <TypeDot tone="attendance" label="Attendance" />}
                {hasLeave && <TypeDot tone="leave" label="Leave" />}
                {hasHoliday && <TypeDot tone="holiday" label="Holiday" />}
                {hasWork && <TypeDot tone="work" label="Work mode" />}
                {dayEvents.length > 0 && !hasHoliday && <TypeDot tone="event" label="Event" />}
              </span>
            </span>
            {summary.approvedLeaves?.length > 0 && (
              <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
                {summary.approvedLeaves.length} on leave
              </span>
            )}
            {summary.checkins?.length > 0 && (
              <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                {summary.checkins.length} check-ins
              </span>
            )}
            {dayEvents.slice(0, 2).map((event) => (
              <span
                key={event.id}
                role="presentation"
                onClick={(e) => { e.stopPropagation(); onOpenEvent(event); }}
                className="mt-0.5 flex w-full items-center gap-1.5 truncate rounded-md bg-white/80 px-1.5 py-1 text-[10px] font-medium text-slate-700 ring-1 ring-slate-100 transition group-hover:bg-white"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: EVENT_DASH[event.type] || EVENT_DASH.other }} aria-hidden />
                {event.title}
              </span>
            ))}
            {dayEvents.length > 2 && <span className="text-[10px] font-medium text-slate-400">+{dayEvents.length - 2} more</span>}
          </button>
        );
      })}
    </div>
  );
}
export function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mode, setMode] = useSessionState('calendar:mode', 'list');
  const [selectedId, setSelectedId] = useSessionState('calendar:selected', '');
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useSessionState('calendar:view', 'week');
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useSessionState('calendar:selectedDate', toDateKey(new Date()));
  const [query, setQuery] = useState('');
  const [attendanceRows, setAttendanceRows] = useState([]);
  const [leaveRows, setLeaveRows] = useState([]);
  const [workModeRows, setWorkModeRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeDay, setActiveDay] = useState('');

  const canViewAttendance = useAnyPermission([PERMISSIONS.VIEW_ATTENDANCE, PERMISSIONS.MANUAL_ATTENDANCE]);
  const canViewLeaves = useAnyPermission([PERMISSIONS.VIEW_LEAVE_REQUESTS, PERMISSIONS.APPROVE_LEAVE, PERMISSIONS.REJECT_LEAVE]);
  const canViewWorkModes = useAnyPermission([PERMISSIONS.VIEW_WORK_MODE_REQUESTS, PERMISSIONS.APPROVE_WORK_MODE, PERMISSIONS.REJECT_WORK_MODE]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [eventData, attendanceData, leaveData, workModeData, userData] = await Promise.all([
        adminService.getCalendarEvents(),
        canViewAttendance ? adminService.getAttendance().catch(() => []) : Promise.resolve([]),
        canViewLeaves ? adminService.getLeaves().catch(() => []) : Promise.resolve([]),
        canViewWorkModes ? adminService.getWorkModeRequests().catch(() => []) : Promise.resolve([]),
        adminService.getUsers().catch(() => []),
      ]);
      setEvents(eventData || []);
      setAttendanceRows(attendanceData || []);
      setLeaveRows(leaveData || []);
      setWorkModeRows(workModeData || []);
      setUsers(userData || []);
      if (!silent) setError('');
    } catch (err) {
      if (!silent) setError(err.message || 'Failed to load events');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [canViewAttendance, canViewLeaves, canViewWorkModes]);

  useEffect(() => { load(); }, [load]);
  useSilentPoll(load, 30000, []);

  useEffect(() => {
    const date = parseDate(selectedDate);
    if (!date) return;
    if (date.getFullYear() !== monthDate.getFullYear() || date.getMonth() !== monthDate.getMonth()) {
      setMonthDate(new Date(date.getFullYear(), date.getMonth(), 1));
    }
  }, [selectedDate, monthDate]);

  const normalizedEvents = useMemo(() => events.map(normalizeEvent), [events]);
  const filteredEvents = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return normalizedEvents;
    return normalizedEvents.filter((event) =>
      [event.title, event.description, event.type, event.time]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [normalizedEvents, query]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    for (const event of filteredEvents) {
      const list = map.get(event.dateKey) || [];
      list.push(event);
      map.set(event.dateKey, list);
    }
    for (const list of map.values()) list.sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
    return map;
  }, [filteredEvents]);

  const summariesByDay = useMemo(() => {
    const keys = new Set([
      ...filteredEvents.map((event) => event.dateKey).filter(Boolean),
      ...attendanceRows.map(attendanceDateKey).filter(Boolean),
      ...workModeRows.map(workModeDateKey).filter(Boolean),
    ]);
    for (const leave of leaveRows) {
      const start = parseDate(leave.start_date);
      const end = parseDate(leave.end_date);
      if (!start || !end) continue;
      const cursor = startOfDay(start);
      const last = startOfDay(end);
      while (cursor <= last) {
        keys.add(toDateKey(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    const map = new Map();
    keys.forEach((dateKey) => {
      map.set(dateKey, daySummary({ dateKey, events: filteredEvents, attendanceRows, leaveRows, workModeRows, users }));
    });
    return map;
  }, [filteredEvents, attendanceRows, leaveRows, workModeRows, users]);

  const timelineDays = useMemo(() => buildTimelineDays(selectedDate, view), [selectedDate, view]);
  const eventDays = useMemo(() => new Set(summariesByDay.keys()), [summariesByDay]);
  const selected = events.find((event) => event.id === selectedId);
  const activeDaySummary = activeDay
    ? summariesByDay.get(activeDay) || daySummary({ dateKey: activeDay, events: filteredEvents, attendanceRows, leaveRows, workModeRows, users })
    : null;
  const now = new Date();
  const todayKey = toDateKey(now);
  const todayIndex = timelineDays.findIndex((day) => day.key === todayKey);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const showNow = view !== 'month' && todayIndex >= 0 && nowMinutes >= TIMELINE_START * 60 && nowMinutes <= TIMELINE_END * 60;
  const nowTop = showNow ? ((nowMinutes - TIMELINE_START * 60) / TIMELINE_MINUTES) * TIMELINE_HEIGHT : 0;
  const navigatorDate = parseDate(selectedDate) || monthDate;
  const timeColWidth = 64;
  const dayCols = Math.max(timelineDays.length, 1);

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(event) {
    const dateKey = event.date?.split?.('T')?.[0] || event.date || selectedDate;
    setMode('edit');
    setSelectedId(event.id);
    setSelectedDate(dateKey);
    setForm({
      title: event.title || '',
      description: event.description || '',
      date: dateKey,
      time: event.time || '',
      type: event.type || 'other',
      visibility: event.visibility || 'all',
    });
  }

  function closePanel() {
    setMode('list');
    setSelectedId('');
    setForm(emptyForm);
  }

  function shiftMonth(delta) {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  function shiftRange(delta) {
    const base = parseDate(selectedDate) || new Date();
    if (view === 'month') {
      const next = new Date(base.getFullYear(), base.getMonth() + delta, 1);
      setSelectedDate(toDateKey(next));
      setMonthDate(next);
      return;
    }
    base.setDate(base.getDate() + delta * (view === 'day' ? 1 : 7));
    const nextKey = toDateKey(base);
    setSelectedDate(nextKey);
    setMonthDate(new Date(base.getFullYear(), base.getMonth(), 1));
  }

  function openDay(dateKey) {
    setSelectedDate(dateKey);
    updateForm('date', dateKey);
    const date = parseDate(dateKey);
    if (date) setMonthDate(new Date(date.getFullYear(), date.getMonth(), 1));
    setActiveDay(dateKey);
  }

  function jumpToToday() {
    const key = toDateKey(new Date());
    setSelectedDate(key);
    updateForm('date', key);
    setMonthDate(new Date());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const validationError = validateEvent(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    const payload = {
      title: form.title,
      description: form.description,
      date: form.date,
      time: form.time,
      type: form.type,
      visibility: form.visibility,
      color: EVENT_DASH[form.type] || RAIL,
    };
    try {
      if (mode === 'edit' && selectedId) {
        await adminService.updateCalendarEvent(selectedId, payload);
        setSuccess('Event updated.');
      } else {
        const created = await adminService.createCalendarEvent(payload);
        setSelectedId(created.id);
        setSuccess('Event created.');
      }
      setMode('list');
      await load(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!selectedId || !window.confirm('Delete this event?')) return;
    setBusy(true);
    try {
      await adminService.deleteCalendarEvent(selectedId);
      setSuccess('Event deleted.');
      setSelectedId('');
      setMode('list');
      await load(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const headerLabel = view === 'day' ? formatDayLabel(navigatorDate) : formatMonthLabel(navigatorDate);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden font-sans text-[#0F172A] antialiased lg:flex-row">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-[rgba(136,152,170,0.18)] bg-[#F8FAFC] shadow-[0_8px_24px_rgba(0,167,214,0.08)]">
        <header className="flex shrink-0 flex-col gap-3 border-b border-[rgba(136,152,170,0.18)] bg-white px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Calendar</h1>
            <p className="mt-1 text-sm text-slate-500">See workforce availability at a glance.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex ui-segment">
              {['month', 'week', 'day'].map((item) => {
                const active = view === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setView(item)}
                    className={`ui-segment-item capitalize ${active ? 'ui-segment-item-active' : ''}`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={jumpToToday} className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 transition-colors hover:border-[#00B0FF]/50 hover:text-[#00B0FF]">Today</button>
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1">
              <button type="button" onClick={() => shiftRange(-1)} className="grid h-8 w-8 place-items-center rounded-full text-[#8898AA] transition-all duration-200 hover:bg-white hover:text-[#00B0FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B0FF]/40" aria-label="Previous">
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <p className="min-w-[8.5rem] text-center text-sm font-bold text-slate-900">{headerLabel}</p>
              <button type="button" onClick={() => shiftRange(1)} className="grid h-8 w-8 place-items-center rounded-full text-[#8898AA] transition-all duration-200 hover:bg-white hover:text-[#00B0FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B0FF]/40" aria-label="Next">
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </header>

        {error && <div className="mx-4 mt-3 shrink-0 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 sm:mx-6">{error}</div>}
        {success && <div className="mx-4 mt-3 shrink-0 rounded-xl border border-[#70C8F4]/40 bg-[#F0F9FD] px-4 py-2.5 text-sm font-semibold text-[#075985] sm:mx-6">{success}</div>}

        {loading ? (
          <div className="min-h-0 flex-1 overflow-auto p-6"><SkeletonFeed count={5} /></div>
        ) : summariesByDay.size === 0 && view !== 'month' ? (
          <EmptyStateBody
            size="sm"
            icon={CalendarPlus}
            title="No events scheduled"
            description="Holidays, company-wide events and shift notes you add here are visible to every employee."
            className="min-h-0 flex-1 py-8"
          />
        ) : view === 'month' ? (
          <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
            <MonthGrid
              monthDate={monthDate}
              selectedDate={selectedDate}
              eventsByDay={eventsByDay}
              summariesByDay={summariesByDay}
              onSelect={(dateKey) => {
                setSelectedDate(dateKey);
                updateForm('date', dateKey);
              }}
              onOpenEvent={startEdit}
              onOpenDay={openDay}
            />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto bg-[#F8FAFC] p-4 sm:p-5">
            <div className="min-w-[640px] overflow-hidden rounded-2xl bg-[#F8FAFC]">
              <div
                className="grid border-b"
                style={{ gridTemplateColumns: `${timeColWidth}px repeat(${dayCols}, minmax(0, 1fr))`, borderColor: GRID_LINE }}
              >
                <div className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider text-[#8898AA]">Time</div>
                {timelineDays.map((day) => {
                  const isSelected = day.key === selectedDate;
                  const summary = summariesByDay.get(day.key) || {};
                  return (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => openDay(day.key)}
                      className={`my-1 flex flex-col items-center justify-center rounded-xl px-3 py-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B0FF]/40 ${
                        isSelected ? 'bg-white shadow-sm ring-1 ring-[#00B0FF]/20' : 'bg-transparent hover:bg-white/70'
                      } ${view === 'day' ? 'mx-auto w-fit min-w-[8rem]' : 'mx-1 w-[calc(100%-0.5rem)]'}`}
                    >
                      <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                        {day.label}
                      </span>
                      <span className="mt-0.5 text-base font-semibold leading-tight text-slate-800">
                        {day.date.getDate()}
                      </span>
                      <span className="mt-1 flex h-2 items-center gap-1" aria-hidden>
                        {summary.checkins?.length > 0 && <TypeDot tone="attendance" label="Attendance" />}
                        {summary.leaves?.length > 0 && <TypeDot tone="leave" label="Leave" />}
                        {summary.holidays?.length > 0 && <TypeDot tone="holiday" label="Holiday" />}
                        {summary.workModeRequests?.length > 0 && <TypeDot tone="work" label="Work mode" />}
                        {summary.events?.length > 0 && !summary.holidays?.length && <TypeDot tone="event" label="Event" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div
                className="relative grid"
                style={{ height: TIMELINE_HEIGHT, gridTemplateColumns: `${timeColWidth}px repeat(${dayCols}, minmax(0, 1fr))` }}
              >
                <div className="relative bg-[#F8FAFC]" style={{ borderRight: `1px solid ${GRID_LINE}` }}>
                  {TIMELINE_HOURS.slice(0, -1).map((hour, index) => (
                    <div key={hour} className="absolute left-0 right-0 px-2 pt-1.5 text-xs font-medium text-[#8898AA]" style={{ top: index * HOUR_HEIGHT, borderTop: `1px solid ${GRID_LINE}` }}>
                      {pad(hour)}:00
                    </div>
                  ))}
                </div>

                {timelineDays.map((day) => {
                  const dayEvents = eventsByDay.get(day.key) || [];
                  return (
                    <div key={day.key} className="relative overflow-hidden last:border-r-0" style={{ borderRight: `1px solid ${GRID_LINE}` }}>
                      {TIMELINE_HOURS.slice(0, -1).map((hour, index) => (
                        <div key={hour} className="absolute left-0 right-0" style={{ top: index * HOUR_HEIGHT, borderTop: `1px solid ${GRID_LINE}` }} />
                      ))}
                      {dayEvents.map((event, eventIndex) => (
                        <TimelineEventCard key={event.id} event={event} index={eventIndex} compact={view === 'day'} onClick={() => startEdit(event)} />
                      ))}
                    </div>
                  );
                })}

                {showNow && (
                  <div className="calendar-now-line pointer-events-none absolute right-0 z-20" style={{ top: nowTop, left: timeColWidth }} aria-hidden>
                    <span className="calendar-now-dot" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <aside
        className="flex min-h-0 w-full shrink-0 flex-col overflow-hidden rounded-3xl p-4 text-slate-800 shadow-[0_8px_24px_rgba(15,23,42,0.06)] lg:w-[360px] lg:p-5"
        style={{ background: SIDEBAR_GRADIENT }}
      >
        <div className="relative flex w-full shrink-0 items-center rounded-full border border-slate-200 bg-white transition-all duration-200 hover:border-slate-300 focus-within:border-[#00B0FF]/50 focus-within:ring-2 focus-within:ring-[#00B0FF]/10">
          <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" aria-hidden />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className={`w-full rounded-full bg-transparent py-2 pl-10 text-sm font-medium text-slate-800 outline-none placeholder:text-slate-400 ${query ? 'pr-10' : 'pr-4'}`}
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-2 grid h-7 w-7 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Clear search">
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
        </div>

        <div className="mt-4 shrink-0">
          <MiniCalendar
            monthDate={monthDate}
            selectedDate={selectedDate}
            eventDays={eventDays}
            onSelect={(dateKey) => {
              setSelectedDate(dateKey);
              updateForm('date', dateKey);
              setMonthDate(parseDate(dateKey) || monthDate);
            }}
            onShiftMonth={shiftMonth}
          />
        </div>

        <PermissionGate anyOf={[PERMISSIONS.CREATE_EVENTS, PERMISSIONS.EDIT_EVENTS]}>
          <form
            onSubmit={handleSubmit}
            className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white p-5 text-slate-800 shadow-[0_10px_25px_rgba(0,0,0,0.08)]"
          >
            <div className="flex shrink-0 items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold tracking-tight text-slate-900">{mode === 'edit' ? 'Edit event' : 'Add event'}</h2>
                <p className="mt-0.5 text-xs font-medium text-[#8898AA]">Schedule a company event</p>
              </div>
              {(mode === 'edit' || form.title) && (
                <button type="button" onClick={closePanel} className="grid h-8 w-8 place-items-center rounded-full text-[#8898AA] transition hover:bg-[#F0F9FD] hover:text-[#00B0FF] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00B0FF]/40" aria-label="Reset form">
                  <X className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="mt-4 flex flex-wrap gap-2">
                {EVENT_TYPES.map((type) => {
                  const active = form.type === type.value;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => updateForm('type', type.value)}
                      className={`rounded-full px-3 py-1.5 text-xs transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#70C8F4]/40 ${
                        active
                          ? 'border-2 border-[#00B0FF] bg-white font-semibold text-[#00B0FF] shadow-sm'
                          : 'border border-transparent bg-[#F0F9FD] font-medium text-[#8898AA] hover:border-[#70C8F4]'
                      }`}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 space-y-3">
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8898AA]">Title</span>
                  <input required placeholder="Design review" value={form.title} onChange={(e) => updateForm('title', e.target.value)} className={inputClass} />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <div className="block min-w-0">
                    <span id="event-date-label" className="text-[11px] font-semibold uppercase tracking-wider text-[#8898AA]">Date</span>
                    <DatePickerField
                      labelledBy="event-date-label"
                      value={form.date}
                      onChange={(dateKey) => {
                        updateForm('date', dateKey);
                        if (dateKey) setSelectedDate(dateKey);
                      }}
                    />
                  </div>
                  <div className="block min-w-0">
                    <span id="event-time-label" className="text-[11px] font-semibold uppercase tracking-wider text-[#8898AA]">Time</span>
                    <TimePickerField
                      labelledBy="event-time-label"
                      value={form.time}
                      onChange={(time) => updateForm('time', time)}
                    />
                  </div>
                </div>

                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8898AA]">Invite / notes</span>
                  <textarea
                    rows={2}
                    placeholder="Add people, location, or agenda"
                    value={form.description}
                    onChange={(e) => updateForm('description', e.target.value)}
                    className={`${inputClass} resize-none`}
                  />
                </label>
              </div>
            </div>

            <div className="mt-3 flex shrink-0 flex-col gap-2">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#00B0FF] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-[#0099E6] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#70C8F4]/70"
              >
                <Plus className="h-4 w-4" aria-hidden />
                {mode === 'edit' ? 'Save event' : 'Add event'}
              </button>
              {mode === 'edit' && selected && (
                <PermissionGate permission={PERMISSIONS.DELETE_EVENTS}>
                  <button type="button" onClick={handleDelete} disabled={busy} className="w-full rounded-xl border border-rose-200 bg-rose-50/60 py-2.5 text-sm font-medium text-rose-500 transition-all duration-200 hover:bg-rose-100 disabled:opacity-60">
                    Delete
                  </button>
                </PermissionGate>
              )}
            </div>
          </form>
        </PermissionGate>
      </aside>

      <SlideOverPanel
        open={Boolean(activeDaySummary)}
        onClose={() => setActiveDay('')}
        title={activeDay ? formatDayLabel(parseDate(activeDay) || new Date()) : 'Day details'}
        description="Attendance, leave, events and work mode context for this day."
      >
        {activeDaySummary && (
          <DayContextPanel
            summary={activeDaySummary}
            onEditEvent={startEdit}
            onClose={() => setActiveDay('')}
          />
        )}
      </SlideOverPanel>
    </div>
  );
}

function DayContextPanel({ summary, onEditEvent, onClose }) {
  const workModeEntries = Object.entries(summary.workModes || {}).sort((a, b) => b[1] - a[1]);
  const hasWorkModeDistribution = workModeEntries.length > 0;
  return (
    <div className="space-y-5">
      <ContextSummary summary={summary} />

      <ContextSection title="People on leave" empty="No leave records for this day.">
        {summary.leaves.map((leave) => (
          <ContextRow
            key={leave.id || `${leave.employee_uid}-${leave.start_date}`}
            dot={normalizeStatus(leave.status) === 'approved' ? 'bg-sky-500' : 'bg-amber-500'}
            title={formatEmployeeDisplay(leave)}
            meta={`${formatLeaveTypeLabel(leave.leave_type)} / ${formatLeaveStatus(leave.status)}`}
          />
        ))}
      </ContextSection>

      <ContextSection title="Attendance" empty="No attendance records for this day.">
        {summary.attendance.map((row) => (
          <ContextRow
            key={row.id || `${row.user_uid}-${row.timestamp}-${row.type}`}
            dot={normalizeAttendanceType(row.type) === 'checkout' ? 'bg-slate-400' : 'bg-emerald-500'}
            title={`${employeeName(row)} ${normalizeAttendanceType(row.type) === 'checkout' ? 'checked out' : 'checked in'}`}
            meta={`${formatStamp(row.timestamp)}${row.is_manual ? ' / manual' : ''}`}
          />
        ))}
      </ContextSection>

      <ContextSection title="Events" empty="No calendar events for this day.">
        {summary.events.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => {
              onClose();
              onEditEvent(event);
            }}
            className="flex w-full items-start gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-slate-50"
          >
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: EVENT_DASH[event.type] || EVENT_DASH.other }} aria-hidden />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-slate-800">{event.title}</span>
              <span className="block text-xs text-slate-400">{timeLabel(event)} / {EVENT_TYPES.find((type) => type.value === event.type)?.label || 'Event'}</span>
              {event.description && <span className="mt-0.5 line-clamp-2 block text-xs text-slate-500">{event.description}</span>}
            </span>
          </button>
        ))}
      </ContextSection>

      <ContextSection title="Work mode information" empty={!hasWorkModeDistribution && summary.workModeRequests.length === 0 ? 'No work mode information for this day.' : ''}>
        {hasWorkModeDistribution && (
          <div className="grid grid-cols-2 gap-2">
            {workModeEntries.map(([mode, count]) => (
              <div key={mode} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-xs text-slate-400">{mode}</p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-slate-800">{count}</p>
              </div>
            ))}
          </div>
        )}
        {summary.workModeRequests.map((request) => (
          <ContextRow
            key={request.id || `${request.employee_uid}-${request.created_at}`}
            dot={normalizeStatus(request.status) === 'approved' ? 'bg-emerald-500' : normalizeStatus(request.status) === 'pending' ? 'bg-amber-500' : 'bg-slate-300'}
            title={employeeName(request)}
            meta={`${formatWorkMode(request.current_work_mode)} to ${formatWorkMode(request.requested_work_mode)} / ${normalizeStatus(request.status)}`}
          />
        ))}
      </ContextSection>
    </div>
  );
}

function ContextSummary({ summary }) {
  const items = [
    { label: 'Check-ins', value: summary.checkins.length, Icon: Clock3, tone: 'text-emerald-700' },
    { label: 'On leave', value: summary.approvedLeaves.length, Icon: Users, tone: 'text-sky-700' },
    { label: 'Events', value: summary.events.length, Icon: CalendarPlus, tone: 'text-[#0284C7]' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(({ label, value, Icon, tone }) => (
        <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
          <Icon className={`h-4 w-4 ${tone}`} aria-hidden />
          <p className="mt-2 text-lg font-semibold tabular-nums text-slate-900">{value}</p>
          <p className="text-xs text-slate-400">{label}</p>
        </div>
      ))}
    </div>
  );
}

function ContextSection({ title, empty, children }) {
  const content = Array.isArray(children) ? children.filter(Boolean) : children;
  const isEmpty = Array.isArray(content) ? content.length === 0 : !content;
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">{title}</h3>
      <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-100 bg-white">
        {isEmpty ? <p className="px-3 py-3 text-sm text-slate-500">{empty}</p> : content}
      </div>
    </section>
  );
}

function ContextRow({ dot, title, meta }) {
  return (
    <div className="flex items-start gap-3 px-3 py-2.5">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-slate-800">{title}</span>
        {meta && <span className="block text-xs text-slate-400">{meta}</span>}
      </span>
    </div>
  );
}
