/**
 * Design-reference seed for Attendance Activity — used when live records are too
 * sparse (a handful of isolated days) to form the multi-peak wave.
 */

export const mockAttendanceActivity = [
  { date: 'Jul 20', checkIns: 22, checkOuts: 18 },
  { date: 'Jul 21', checkIns: 48, checkOuts: 40 },
  { date: 'Jul 22', checkIns: 32, checkOuts: 28 },
  { date: 'Jul 23', checkIns: 65, checkOuts: 58 },
  { date: 'Jul 24', checkIns: 78, checkOuts: 70 },
  { date: 'Jul 25', checkIns: 45, checkOuts: 38 },
  { date: 'Jul 26', checkIns: 52, checkOuts: 46 },
  { date: 'Jul 27', checkIns: 28, checkOuts: 22 },
  { date: 'Jul 28', checkIns: 60, checkOuts: 52 },
  { date: 'Jul 29', checkIns: 35, checkOuts: 30 },
  { date: 'Jul 30', checkIns: 72, checkOuts: 64 },
  { date: 'Jul 31', checkIns: 62, checkOuts: 55 },
  { date: 'Aug 01', checkIns: 68, checkOuts: 60 },
  { date: 'Aug 02', checkIns: 66, checkOuts: 58 },
  { date: 'Aug 03', checkIns: 30, checkOuts: 24 },
  { date: 'Aug 04', checkIns: 18, checkOuts: 14 },
  { date: 'Aug 05', checkIns: 25, checkOuts: 20 },
  { date: 'Aug 06', checkIns: 22, checkOuts: 18 },
  { date: 'Aug 07', checkIns: 45, checkOuts: 38 },
  { date: 'Aug 08', checkIns: 58, checkOuts: 50 },
  { date: 'Aug 09', checkIns: 75, checkOuts: 68 },
  { date: 'Aug 10', checkIns: 92, checkOuts: 84 },
  { date: 'Aug 11', checkIns: 64, checkOuts: 56 },
  { date: 'Aug 12', checkIns: 38, checkOuts: 32 },
  { date: 'Aug 13', checkIns: 20, checkOuts: 16 },
  { date: 'Aug 14', checkIns: 55, checkOuts: 48 },
  { date: 'Aug 15', checkIns: 84, checkOuts: 76 },
  { date: 'Aug 16', checkIns: 88, checkOuts: 80 },
  { date: 'Aug 17', checkIns: 70, checkOuts: 62 },
  { date: 'Aug 18', checkIns: 15, checkOuts: 12 },
];

const MONTH_INDEX = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

function toIsoKey(label, year = 2026) {
  const [month, day] = String(label).split(/\s+/);
  const monthIndex = MONTH_INDEX[month];
  const dayNumber = Number(day);
  const date = new Date(year, monthIndex, dayNumber);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function buildMockAttendanceActivitySeries(year = 2026) {
  return mockAttendanceActivity.map((row) => {
    const key = toIsoKey(row.date, year);
    const checkins = Number(row.checkIns) || 0;
    const checkouts = Number(row.checkOuts) || 0;
    return {
      key,
      date: key,
      label: row.date,
      checkins,
      checkouts,
      events: checkins + checkouts,
    };
  });
}

export function isSparseAttendanceSeries(data, minActiveDays = 8) {
  const activeDays = (data || []).filter((row) => {
    const events = Number(row.events) || 0;
    const checkins = Number(row.checkins) || 0;
    const checkouts = Number(row.checkouts) || 0;
    return events > 0 || checkins > 0 || checkouts > 0;
  }).length;
  return activeDays < minActiveDays;
}

export function withAttendanceActivityFallback(series, rangeDayCount = 0) {
  const data = series?.data || [];
  const granularity = series?.granularity || 'daily';
  const shouldSeed =
    granularity === 'daily' &&
    rangeDayCount >= 14 &&
    isSparseAttendanceSeries(data);

  if (!shouldSeed) return series;
  return {
    data: buildMockAttendanceActivitySeries(),
    granularity: 'daily',
    seeded: true,
  };
}
