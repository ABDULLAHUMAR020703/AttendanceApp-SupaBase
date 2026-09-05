/**
 * Run: node --test services/auth-service/test/payrollEngine.test.cjs
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  countBusinessDays,
  findProfileForDate,
  calculatePayrollRecord,
} = require('../lib/payrollEngine');

const monthlyProfile = (overrides = {}) => ({
  salary_type: 'monthly',
  basic_salary: 100000,
  currency: 'PKR',
  standard_working_days: 20,
  standard_working_hours: 8,
  overtime_enabled: false,
  overtime_rate: null,
  tax_enabled: false,
  ...overrides,
});

function attendanceForDays(dateStrings, hours = 8) {
  const records = [];
  for (const day of dateStrings) {
    records.push({ type: 'checkin', timestamp: `${day}T09:00:00Z` });
    records.push({ type: 'checkout', timestamp: `${day}T${String(9 + hours).padStart(2, '0')}:00:00Z` });
  }
  return records;
}

const BUSINESS_DAYS_JUNE_2026 = [
  '2026-06-01', '2026-06-02', '2026-06-03', '2026-06-04', '2026-06-05',
  '2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11', '2026-06-12',
  '2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19',
  '2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25', '2026-06-26',
]; // 20 business days in June 2026

test('countBusinessDays counts only Mon-Fri', () => {
  assert.equal(countBusinessDays('2026-06-01', '2026-06-30'), 22);
});

test('case 1: full attendance, no overtime, no deductions -> gross = net = salary', () => {
  const profile = monthlyProfile();
  const result = calculatePayrollRecord({
    profile,
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    attendanceRecords: attendanceForDays(BUSINESS_DAYS_JUNE_2026),
    leaveRequests: [],
  });
  assert.equal(result.workedDays, 20);
  assert.equal(result.absentDays, 0);
  assert.equal(result.grossSalary, 100000);
  assert.equal(result.netSalary, 100000);
});

test('case 2: approved paid leave does not reduce salary', () => {
  const profile = monthlyProfile();
  const worked = BUSINESS_DAYS_JUNE_2026.slice(0, 18); // worked 18, on leave for 2
  const result = calculatePayrollRecord({
    profile,
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    attendanceRecords: attendanceForDays(worked),
    leaveRequests: [
      { status: 'approved', leave_type: 'annual', start_date: '2026-06-25', end_date: '2026-06-26' },
    ],
  });
  assert.equal(result.paidLeaveDays, 2);
  assert.equal(result.absentDays, 0);
  assert.equal(result.netSalary, 100000);
});

test('case 3: approved unpaid leave reduces pay by the per-day rate', () => {
  const profile = monthlyProfile();
  const worked = BUSINESS_DAYS_JUNE_2026.slice(0, 18);
  const result = calculatePayrollRecord({
    profile,
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    attendanceRecords: attendanceForDays(worked),
    leaveRequests: [
      { status: 'approved', leave_type: 'sabbatical', start_date: '2026-06-25', end_date: '2026-06-26' },
    ],
    paidLeaveTypes: ['annual', 'sick', 'casual'],
  });
  assert.equal(result.unpaidLeaveDays, 2);
  const perDayRate = 100000 / 20;
  assert.equal(result.netSalary, Math.round((100000 - perDayRate * 2) * 100) / 100);
});

test('case 4: overtime pays hours above standard at overtime_rate', () => {
  const profile = monthlyProfile({ overtime_enabled: true, overtime_rate: 500 });
  const records = [
    { type: 'checkin', timestamp: '2026-06-01T09:00:00Z' },
    { type: 'checkout', timestamp: '2026-06-01T21:00:00Z' }, // 12 hours -> 4 overtime
  ];
  const result = calculatePayrollRecord({
    profile,
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    attendanceRecords: records,
    leaveRequests: [],
  });
  assert.equal(result.overtimeHours, 4);
  assert.equal(result.overtimeAmount, 2000);
});

test('case 5: manual allowance increases gross salary', () => {
  const profile = monthlyProfile();
  const result = calculatePayrollRecord({
    profile,
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    attendanceRecords: attendanceForDays(BUSINESS_DAYS_JUNE_2026),
    leaveRequests: [],
    manualEarnings: [{ type: 'allowance', amount: 5000 }],
  });
  assert.equal(result.allowancesAmount, 5000);
  assert.equal(result.grossSalary, 105000);
});

test('case 6: manual deduction decreases net salary', () => {
  const profile = monthlyProfile();
  const result = calculatePayrollRecord({
    profile,
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    attendanceRecords: attendanceForDays(BUSINESS_DAYS_JUNE_2026),
    leaveRequests: [],
    manualDeductions: [{ type: 'loan', amount: 3000 }],
  });
  assert.equal(result.deductionsAmount, 3000);
  assert.equal(result.netSalary, 97000);
});

test('case 7: manual adjustments are additive, not a silent overwrite of the base calculation', () => {
  const profile = monthlyProfile();
  const result = calculatePayrollRecord({
    profile,
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    attendanceRecords: attendanceForDays(BUSINESS_DAYS_JUNE_2026),
    leaveRequests: [],
    manualEarnings: [{ type: 'bonus', amount: 10000 }],
    manualDeductions: [{ type: 'advance', amount: 2000 }],
  });
  assert.equal(result.baseEarning, 100000);
  assert.equal(result.grossSalary, 110000);
  assert.equal(result.netSalary, 108000);
});

test('case 8: salary history — profile selection uses the date, not "current" salary', () => {
  const profiles = [
    { effective_from: '2026-01-01', effective_to: '2026-06-30', basic_salary: 100000 },
    { effective_from: '2026-07-01', effective_to: null, basic_salary: 120000 },
  ];
  assert.equal(findProfileForDate(profiles, '2026-05-15').basic_salary, 100000);
  assert.equal(findProfileForDate(profiles, '2026-07-10').basic_salary, 120000);
  assert.equal(findProfileForDate(profiles, '2026-06-30').basic_salary, 100000);
});

test('throws a typed error when no salary profile covers the period', () => {
  assert.throws(
    () =>
      calculatePayrollRecord({
        profile: null,
        periodStart: '2026-06-01',
        periodEnd: '2026-06-30',
        attendanceRecords: [],
        leaveRequests: [],
      }),
    /salary profile/i
  );
});

test('hourly salary type pays regular hours and paid leave at the hourly rate', () => {
  const profile = monthlyProfile({ salary_type: 'hourly', basic_salary: 500, standard_working_hours: 8 });
  const result = calculatePayrollRecord({
    profile,
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    attendanceRecords: attendanceForDays(['2026-06-01', '2026-06-02']), // 16 regular hours
    leaveRequests: [{ status: 'approved', leave_type: 'annual', start_date: '2026-06-03', end_date: '2026-06-03' }],
  });
  // 16 worked hours + 8 paid-leave hours = 24 hours * 500
  assert.equal(result.baseEarning, 12000);
});
