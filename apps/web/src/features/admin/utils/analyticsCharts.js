const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const RANGE_PRESETS = [
  { value: 'today', label: 'Today', group: 'Quick' },
  { value: 'yesterday', label: 'Yesterday', group: 'Quick' },
  { value: 'this_week', label: 'This Week', group: 'Week' },
  { value: 'last_week', label: 'Last Week', group: 'Week' },
  { value: 'last_7d', label: 'Last 7 Days', group: 'Rolling' },
  { value: 'last_30d', label: 'Last 30 Days', group: 'Rolling' },
  { value: 'last_90d', label: 'Last 90 Days', group: 'Rolling' },
  { value: 'this_month', label: 'This Month', group: 'Calendar' },
  { value: 'last_month', label: 'Last Month', group: 'Calendar' },
  { value: 'this_quarter', label: 'This Quarter', group: 'Calendar' },
  { value: 'this_year', label: 'This Year', group: 'Calendar' },
  { value: 'custom', label: 'Custom Range', group: 'Custom' },
];

/** @typedef {{ type: 'department'|'employee'|'attendance', id: string, label: string }} DrillDownTarget */

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

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return startOfDay(d);
}

export function formatShortDate(date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatMonthLabel(date) {
  return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

export function formatRangeLabel(start, end) {
  const sameYear = start.getFullYear() === end.getFullYear();
  const startFmt = start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const endFmt = end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startFmt} – ${endFmt}`;
}

export function getRangeDayCount(range) {
  if (!range) return 0;
  return Math.max(1, Math.ceil((range.end - range.start) / (1000 * 60 * 60 * 24)));
}

export function resolveDateRange(preset, customFrom, customTo) {
  const now = new Date();

  if (preset === 'custom') {
    if (!customFrom || !customTo) return null;
    const start = startOfDay(new Date(customFrom));
    const end = endOfDay(new Date(customTo));
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return null;
    }
    return { start, end, preset };
  }

  switch (preset) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now), preset };
    case 'yesterday': {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday), preset };
    }
    case 'this_week':
      return { start: getMonday(now), end: endOfDay(now), preset };
    case 'last_week': {
      const thisMonday = getMonday(now);
      const lastMonday = new Date(thisMonday);
      lastMonday.setDate(lastMonday.getDate() - 7);
      const lastSunday = new Date(thisMonday);
      lastSunday.setDate(lastSunday.getDate() - 1);
      return { start: startOfDay(lastMonday), end: endOfDay(lastSunday), preset };
    }
    case 'last_7d': {
      const start = startOfDay(now);
      start.setDate(start.getDate() - 6);
      return { start, end: endOfDay(now), preset };
    }
    case 'last_30d':
    case '30d': {
      const start = startOfDay(now);
      start.setDate(start.getDate() - 29);
      return { start, end: endOfDay(now), preset };
    }
    case 'last_90d':
    case '90d': {
      const start = startOfDay(now);
      start.setDate(start.getDate() - 89);
      return { start, end: endOfDay(now), preset };
    }
    case '7d':
    case 'last_7d_legacy': {
      const start = startOfDay(now);
      start.setDate(start.getDate() - 6);
      return { start, end: endOfDay(now), preset };
    }
    case 'this_month':
      return {
        start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
        end: endOfDay(now),
        preset,
      };
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: startOfDay(start), end: endOfDay(end), preset };
    }
    case 'this_quarter': {
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      return { start: startOfDay(start), end: endOfDay(now), preset };
    }
    case 'this_year':
      return {
        start: startOfDay(new Date(now.getFullYear(), 0, 1)),
        end: endOfDay(now),
        preset,
      };
    default: {
      const start = startOfDay(now);
      start.setDate(start.getDate() - 29);
      return { start, end: endOfDay(now), preset: 'last_30d' };
    }
  }
}

export function getAggregationLevel(range) {
  const days = getRangeDayCount(range);
  if (days <= 31) return 'daily';
  if (days <= 90) return 'weekly';
  return 'monthly';
}

export function getAggregationLabel(level) {
  if (level === 'weekly') return 'Weekly';
  if (level === 'monthly') return 'Monthly';
  return 'Daily';
}

export function getRecordTimestamp(record) {
  return record?.timestamp || record?.created_at || record?.check_in_at || null;
}

export function getRecordUserKey(record) {
  return record?.user_uid || record?.uid || record?.username || null;
}

export function normalizeAttendanceType(type) {
  const value = String(type || '').toLowerCase().replace(/-/g, '_');
  if (value === 'check_in' || value === 'checkin') return 'checkin';
  if (value === 'check_out' || value === 'checkout') return 'checkout';
  return value;
}

export function filterRecordsByRange(records, range) {
  if (!range) return [];
  return (records || []).filter((record) => {
    const raw = getRecordTimestamp(record);
    if (!raw) return false;
    const date = new Date(raw);
    return date >= range.start && date <= range.end;
  });
}

export function filterUsersByRegistrationRange(users, range) {
  if (!range) return [];
  return (users || []).filter((user) => {
    if (!user?.created_at) return false;
    const created = new Date(user.created_at);
    return created >= range.start && created <= range.end;
  });
}

function createEmptyBucket(key, label) {
  return { key, label, date: key, checkins: 0, checkouts: 0, events: 0 };
}

export function buildDailyAttendanceSeries(records, range) {
  if (!range) return [];

  const buckets = new Map();
  const cursor = startOfDay(range.start);
  const end = startOfDay(range.end);

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    buckets.set(key, createEmptyBucket(key, formatShortDate(cursor)));
    cursor.setDate(cursor.getDate() + 1);
  }

  for (const record of records || []) {
    const raw = getRecordTimestamp(record);
    if (!raw) continue;
    const date = new Date(raw);
    const key = date.toISOString().slice(0, 10);
    if (!buckets.has(key)) continue;

    const bucket = buckets.get(key);
    const type = normalizeAttendanceType(record.type);
    if (type === 'checkin') bucket.checkins += 1;
    else if (type === 'checkout') bucket.checkouts += 1;
    bucket.events += 1;
  }

  return Array.from(buckets.values());
}

function aggregateAttendanceBuckets(dailySeries, bucketFn, labelFn) {
  const grouped = new Map();

  for (const row of dailySeries) {
    const date = new Date(row.date);
    const key = bucketFn(date);
    if (!grouped.has(key)) {
      grouped.set(key, createEmptyBucket(key, labelFn(date, key)));
    }
    const bucket = grouped.get(key);
    bucket.checkins += row.checkins;
    bucket.checkouts += row.checkouts;
    bucket.events += row.events;
  }

  return Array.from(grouped.values());
}

function weekStartKey(date) {
  const monday = getMonday(date);
  return monday.toISOString().slice(0, 10);
}

export function buildAttendanceSeries(records, range) {
  const daily = buildDailyAttendanceSeries(records, range);
  const granularity = getAggregationLevel(range);

  if (granularity === 'daily') {
    return { data: daily, granularity };
  }

  if (granularity === 'weekly') {
    return {
      data: aggregateAttendanceBuckets(
        daily,
        weekStartKey,
        (date, key) => `Week of ${formatShortDate(new Date(key))}`
      ),
      granularity,
    };
  }

  return {
    data: aggregateAttendanceBuckets(
      daily,
      (date) => `${date.getFullYear()}-${date.getMonth()}`,
      (date) => formatMonthLabel(date)
    ),
    granularity,
  };
}

export function hasSeriesData(series, keys) {
  return (series || []).some((row) => keys.some((key) => Number(row[key] ?? 0) > 0));
}

export function buildDepartmentChartData(distribution) {
  return (distribution || []).map((dept) => ({
    id: dept.id,
    label: dept.name,
    total: dept.employeeCount || 0,
    active: dept.activeCount ?? dept.employeeCount ?? 0,
    activePct: dept.employeeCount
      ? Math.round(((dept.activeCount ?? dept.employeeCount ?? 0) / dept.employeeCount) * 100)
      : 0,
    drillDown: {
      type: 'department',
      id: String(dept.id),
      label: dept.name,
    },
  }));
}

export function computeAnalyticsKpis({ attendanceRecords, users, distribution, range }) {
  const filteredAttendance = filterRecordsByRange(attendanceRecords, range);
  const registrationsInRange = filterUsersByRegistrationRange(users, range);

  let checkins = 0;
  let checkouts = 0;
  const uniqueAttendees = new Set();

  for (const record of filteredAttendance) {
    const type = normalizeAttendanceType(record.type);
    if (type === 'checkin') checkins += 1;
    if (type === 'checkout') checkouts += 1;
    const userKey = getRecordUserKey(record);
    if (userKey) uniqueAttendees.add(String(userKey));
  }

  const attendanceEvents = filteredAttendance.length;
  const uniqueAttendeeCount = uniqueAttendees.size;
  const avgEventsPerAttendee = uniqueAttendeeCount
    ? Math.round((attendanceEvents / uniqueAttendeeCount) * 100) / 100
    : 0;

  const unassignedUsers = distribution.find((d) => d.id === 'unassigned')?.employeeCount || 0;

  return {
    attendanceEvents,
    checkins,
    checkouts,
    uniqueAttendees: uniqueAttendeeCount,
    newRegistrations: registrationsInRange.length,
    avgEventsPerAttendee,
    trackedDepartments: distribution.filter((d) => d.id !== 'unassigned').length,
    unassignedUsers,
    totalUsers: (users || []).length,
    activeAccounts: (users || []).filter((u) => u.is_active).length,
  };
}

export function buildUserGrowthSeries(users) {
  const monthBuckets = new Map();
  for (let i = 0; i < 12; i += 1) {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - i));
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    monthBuckets.set(key, 0);
  }

  for (const user of users || []) {
    if (!user?.created_at) continue;
    const created = new Date(user.created_at);
    const key = `${created.getFullYear()}-${created.getMonth()}`;
    if (monthBuckets.has(key)) {
      monthBuckets.set(key, monthBuckets.get(key) + 1);
    }
  }

  return Array.from(monthBuckets.entries()).map(([key, value]) => {
    const [year, month] = key.split('-').map(Number);
    const cumulative = value;
    return {
      key,
      label: `${MONTH_LABELS[month]} ${String(year).slice(-2)}`,
      users: value,
      month: MONTH_LABELS[month],
      year,
    };
  });
}

export function computeGrowthRate(series) {
  if (!series?.length || series.length < 2) return 0;
  const previous = series[series.length - 2].users;
  const latest = series[series.length - 1].users;
  return ((latest - previous) / Math.max(previous, 1)) * 100;
}

export function truncateChartLabel(label, max = 12) {
  if (!label || label.length <= max) return label;
  return `${label.slice(0, max - 1)}…`;
}
