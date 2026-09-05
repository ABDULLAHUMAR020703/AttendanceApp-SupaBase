/**
 * Payroll V1 calculation engine — pure functions, no Supabase/network calls.
 *
 * Kept independently testable (spec: calculation engine must be unit-tested,
 * not embedded in React components or route handlers). Routes fetch the
 * salary profile, attendance_records and leave_requests rows and pass plain
 * data structures in here; this module returns the numbers a payroll_records
 * row (plus its calculation_snapshot) is built from.
 *
 * Business rules implemented (V1 — see docs/payroll for the written spec):
 *   - Monthly: baseEarning = basicSalary - perDayRate * (absentDays + unpaidLeaveDays)
 *     where perDayRate = basicSalary / workingDays. Paid leave never reduces pay.
 *   - Hourly: baseEarning = hourlyRate * (regularHours + paidLeaveDays * standardHours)
 *     (paid leave is paid at the standard daily hours so it is not silently zeroed).
 *   - Overtime: only counted when the profile has overtime_enabled; hours above
 *     standard_working_hours on a given day, paid at overtime_rate.
 *   - Tax: disabled by default. When enabled, either a flat amount per period
 *     or a percentage of gross salary — no country-specific tax tables.
 *   - Manual earnings/deductions (bonuses, allowances, loans, etc.) are added
 *     on top of the calculated base and never silently replace it.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_PAID_LEAVE_TYPES = ['annual', 'sick', 'casual'];

function toDateOnly(value) {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const str = String(value).slice(0, 10);
  const [y, m, d] = str.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/** Inclusive day count between two Date-onlys. */
function inclusiveDayCount(start, end) {
  if (start > end) return 0;
  return Math.round((end - start) / DAY_MS) + 1;
}

/** Mon-Fri count in [start, end], inclusive. Used when a profile has no explicit standard_working_days. */
function countBusinessDays(periodStart, periodEnd) {
  const start = toDateOnly(periodStart);
  const end = toDateOnly(periodEnd);
  let count = 0;
  for (let cur = start; cur <= end; cur = new Date(cur.getTime() + DAY_MS)) {
    const day = cur.getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

/**
 * Groups attendance_records rows by calendar day within the period, pairing
 * the earliest checkin with the latest checkout to get worked hours per day.
 * A day with a checkin but no matching checkout counts as worked (0 hours) —
 * an attendance data-quality issue, not an absence.
 */
function summarizeAttendance(attendanceRecords, periodStart, periodEnd) {
  const start = toDateOnly(periodStart);
  const end = toDateOnly(periodEnd);
  const byDay = new Map();

  for (const rec of attendanceRecords || []) {
    if (!rec?.timestamp) continue;
    const ts = new Date(rec.timestamp);
    if (Number.isNaN(ts.getTime())) continue;
    const day = new Date(Date.UTC(ts.getUTCFullYear(), ts.getUTCMonth(), ts.getUTCDate()));
    if (day < start || day > end) continue;

    const key = dateKey(day);
    if (!byDay.has(key)) byDay.set(key, { checkin: null, checkout: null });
    const entry = byDay.get(key);
    const type = String(rec.type || '').toLowerCase().replace('_', '');
    if (type === 'checkin') {
      if (!entry.checkin || ts < entry.checkin) entry.checkin = ts;
    } else if (type === 'checkout') {
      if (!entry.checkout || ts > entry.checkout) entry.checkout = ts;
    }
  }

  let workedDays = 0;
  const dailyHours = new Map();
  for (const [key, entry] of byDay) {
    if (entry.checkin) workedDays += 1;
    let hours = 0;
    if (entry.checkin && entry.checkout && entry.checkout > entry.checkin) {
      hours = (entry.checkout - entry.checkin) / 3600000;
    }
    dailyHours.set(key, hours);
  }
  return { workedDays, dailyHours };
}

/**
 * Sums approved leave_requests overlapping the period, split into paid vs
 * unpaid by leave_type. Pending/rejected leave is ignored. `paidLeaveTypes`
 * defaults to the app's current leave types (annual/sick/casual — all drawn
 * from leave_balances) since the schema has no explicit "unpaid" leave_type
 * today; any leave_type outside this list is treated as unpaid.
 */
function summarizeLeave(leaveRequests, periodStart, periodEnd, paidLeaveTypes = DEFAULT_PAID_LEAVE_TYPES) {
  const start = toDateOnly(periodStart);
  const end = toDateOnly(periodEnd);
  let paidLeaveDays = 0;
  let unpaidLeaveDays = 0;

  for (const leave of leaveRequests || []) {
    if (String(leave?.status || '').toLowerCase() !== 'approved') continue;
    const leaveStart = toDateOnly(leave.start_date);
    const leaveEnd = toDateOnly(leave.end_date);
    const overlapStart = leaveStart > start ? leaveStart : start;
    const overlapEnd = leaveEnd < end ? leaveEnd : end;
    let days = inclusiveDayCount(overlapStart, overlapEnd);
    if (days <= 0) continue;
    if (leave.is_half_day) days = 0.5;

    const type = String(leave.leave_type || '').toLowerCase();
    if (paidLeaveTypes.includes(type)) paidLeaveDays += days;
    else unpaidLeaveDays += days;
  }
  return { paidLeaveDays: round2(paidLeaveDays), unpaidLeaveDays: round2(unpaidLeaveDays) };
}

/** Picks the salary profile whose effective range covers `date` (period_start). */
function findProfileForDate(profiles, date) {
  const target = toDateOnly(date);
  return (
    (profiles || []).find((p) => {
      const from = toDateOnly(p.effective_from);
      const to = p.effective_to ? toDateOnly(p.effective_to) : null;
      return from <= target && (!to || to >= target);
    }) || null
  );
}

/**
 * Pure payroll calculation for one employee/period. Does not touch the
 * database — callers fetch profile/attendance/leave rows and manual
 * earnings/deductions and pass them in.
 */
function calculatePayrollRecord({
  profile,
  periodStart,
  periodEnd,
  attendanceRecords = [],
  leaveRequests = [],
  paidLeaveTypes = DEFAULT_PAID_LEAVE_TYPES,
  manualEarnings = [],
  manualDeductions = [],
}) {
  if (!profile) {
    const err = new Error('No salary profile is effective for this employee during the payroll period.');
    err.code = 'PAYROLL_MISSING_SALARY_PROFILE';
    throw err;
  }

  const workingDays = Number(profile.standard_working_days) > 0
    ? Number(profile.standard_working_days)
    : countBusinessDays(periodStart, periodEnd);

  const { workedDays, dailyHours } = summarizeAttendance(attendanceRecords, periodStart, periodEnd);
  const { paidLeaveDays, unpaidLeaveDays } = summarizeLeave(leaveRequests, periodStart, periodEnd, paidLeaveTypes);
  const absentDays = Math.max(round2(workingDays - workedDays - paidLeaveDays - unpaidLeaveDays), 0);

  const standardHours = Number(profile.standard_working_hours) > 0 ? Number(profile.standard_working_hours) : 8;
  let regularHours = 0;
  let overtimeHours = 0;
  for (const hours of dailyHours.values()) {
    regularHours += Math.min(hours, standardHours);
    if (profile.overtime_enabled) overtimeHours += Math.max(hours - standardHours, 0);
  }

  const overtimeRate = Number(profile.overtime_rate) || 0;
  const overtimeAmount = profile.overtime_enabled ? round2(overtimeHours * overtimeRate) : 0;

  const basicSalary = Number(profile.basic_salary) || 0;
  let baseEarning;
  if (profile.salary_type === 'hourly') {
    const paidLeaveHours = paidLeaveDays * standardHours;
    baseEarning = round2(basicSalary * (regularHours + paidLeaveHours));
  } else {
    const perDayRate = workingDays > 0 ? basicSalary / workingDays : 0;
    const unpaidDays = absentDays + unpaidLeaveDays;
    baseEarning = round2(basicSalary - perDayRate * unpaidDays);
  }

  const sumAmount = (rows, filter) =>
    round2((rows || []).filter(filter || (() => true)).reduce((sum, row) => sum + (Number(row.amount) || 0), 0));

  const allowancesAmount = sumAmount(manualEarnings, (e) => e.type === 'allowance');
  const bonusAmount = sumAmount(manualEarnings, (e) => e.type === 'bonus');
  const manualOvertimeAmount = sumAmount(manualEarnings, (e) => e.type === 'overtime');
  const otherEarningsAmount = sumAmount(manualEarnings, (e) => !['allowance', 'bonus', 'overtime'].includes(e.type));
  const manualEarningsTotal = round2(allowancesAmount + bonusAmount + manualOvertimeAmount + otherEarningsAmount);

  const grossSalary = round2(baseEarning + overtimeAmount + manualEarningsTotal);

  let taxAmount = 0;
  if (profile.tax_enabled) {
    taxAmount =
      profile.tax_type === 'percentage'
        ? round2((grossSalary * (Number(profile.tax_value) || 0)) / 100)
        : round2(Number(profile.tax_value) || 0);
  }

  const deductionsAmount = sumAmount(manualDeductions, (d) => d.type !== 'tax');
  const netSalary = round2(grossSalary - deductionsAmount - taxAmount);

  return {
    workingDays: round2(workingDays),
    workedDays: round2(workedDays),
    absentDays,
    paidLeaveDays,
    unpaidLeaveDays,
    regularHours: round2(regularHours),
    overtimeHours: round2(overtimeHours),
    overtimeAmount,
    baseEarning,
    allowancesAmount,
    bonusAmount,
    otherEarningsAmount,
    grossSalary,
    deductionsAmount,
    taxAmount,
    netSalary,
    snapshot: {
      salaryType: profile.salary_type,
      basicSalary,
      currency: profile.currency,
      standardWorkingDays: workingDays,
      standardWorkingHours: standardHours,
      overtimeEnabled: Boolean(profile.overtime_enabled),
      overtimeRate,
      taxEnabled: Boolean(profile.tax_enabled),
      taxType: profile.tax_type || null,
      taxValue: profile.tax_value != null ? Number(profile.tax_value) : null,
      periodStart: String(periodStart).slice(0, 10),
      periodEnd: String(periodEnd).slice(0, 10),
      workedDays,
      absentDays,
      paidLeaveDays,
      unpaidLeaveDays,
      regularHours,
      overtimeHours,
      baseEarning,
      overtimeAmount,
      manualEarningsTotal,
      deductionsAmount,
      taxAmount,
      grossSalary,
      netSalary,
    },
  };
}

module.exports = {
  DEFAULT_PAID_LEAVE_TYPES,
  toDateOnly,
  countBusinessDays,
  summarizeAttendance,
  summarizeLeave,
  findProfileForDate,
  calculatePayrollRecord,
  round2,
};
