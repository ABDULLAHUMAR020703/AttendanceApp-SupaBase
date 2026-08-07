/**
 * Preview seed for the admin dashboard Soft UI — used when live attendance is empty
 * so KPI cards, operations, and the check-in heatmap can be reviewed with density.
 */

const MOCK_ROSTER = [
  { uid: 'mock-u1', username: 'sara.ahmed', name: 'Sara Ahmed', department: 'Engineering', work_mode: 'in_office', is_active: true },
  { uid: 'mock-u2', username: 'bilal.khan', name: 'Bilal Khan', department: 'Engineering', work_mode: 'in_office', is_active: true },
  { uid: 'mock-u3', username: 'nina.ortiz', name: 'Nina Ortiz', department: 'Product', work_mode: 'semi_remote', is_active: true },
  { uid: 'mock-u4', username: 'omar.farooq', name: 'Omar Farooq', department: 'Operations', work_mode: 'in_office', is_active: true },
  { uid: 'mock-u5', username: 'leia.chen', name: 'Leia Chen', department: 'People', work_mode: 'fully_remote', is_active: true },
  { uid: 'mock-u6', username: 'hassan.ali', name: 'Hassan Ali', department: 'Engineering', work_mode: 'in_office', is_active: true },
  { uid: 'mock-u7', username: 'maya.reed', name: 'Maya Reed', department: 'Product', work_mode: 'in_office', is_active: true },
  { uid: 'mock-u8', username: 'zain.malik', name: 'Zain Malik', department: 'Operations', work_mode: 'semi_remote', is_active: true },
  { uid: 'mock-u9', username: 'amira.noor', name: 'Amira Noor', department: 'People', work_mode: 'in_office', is_active: true },
];

const atDayHour = (dayOffset, hour, minute = 0) => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

/** True when there are no check-ins in the last 7 days worth previewing. */
export function shouldSeedDashboardMock(attendanceRows = []) {
  const windowStart = Date.now() - 7 * 86400000;
  return !(attendanceRows || []).some((row) => {
    if (String(row?.type || '').toLowerCase() !== 'checkin') return false;
    const ts = new Date(row.timestamp).getTime();
    return Number.isFinite(ts) && ts >= windowStart;
  });
}

export function buildDashboardMock({ existingUsers = [] } = {}) {
  const users =
    existingUsers.length >= 5
      ? existingUsers.map((u, i) => ({
          ...u,
          work_mode: u.work_mode || MOCK_ROSTER[i % MOCK_ROSTER.length].work_mode,
          department: u.department || MOCK_ROSTER[i % MOCK_ROSTER.length].department,
          is_active: u.is_active !== false,
        }))
      : MOCK_ROSTER.map((row) => ({ ...row }));

  const pick = (i) => users[i % users.length];
  const attendance = [];

  /* Today: 5 on-site (2 late), 2 remote still open, 2 absent — mirrors a busy morning. */
  const todayPlan = [
    { i: 0, hour: 8, minute: 42 },
    { i: 1, hour: 8, minute: 55 },
    { i: 3, hour: 9, minute: 28 }, // late
    { i: 5, hour: 9, minute: 41 }, // late
    { i: 6, hour: 8, minute: 12 },
    { i: 2, hour: 9, minute: 5 }, // remote
    { i: 7, hour: 10, minute: 18 }, // remote
  ];
  for (const entry of todayPlan) {
    const user = pick(entry.i);
    attendance.push({
      user_uid: user.uid,
      username: user.username,
      type: 'checkin',
      timestamp: atDayHour(0, entry.hour, entry.minute),
      is_manual: false,
    });
  }
  /* One manual admin correction today */
  attendance.push({
    user_uid: pick(0).uid,
    username: pick(0).username,
    type: 'checkin',
    timestamp: atDayHour(0, 11, 5),
    is_manual: true,
  });

  /* Prior 6 days — dense morning / lunch pattern for the heatmap */
  const pattern = [
    [8, 15],
    [8, 40],
    [9, 5],
    [9, 35],
    [10, 10],
    [12, 5],
    [13, 20],
    [14, 45],
    [17, 10],
  ];
  for (let day = 1; day <= 6; day += 1) {
    const volume = day === 1 || day === 5 ? pattern.length : Math.max(4, pattern.length - day);
    for (let n = 0; n < volume; n += 1) {
      const [hour, minute] = pattern[n % pattern.length];
      const user = pick((day * 3 + n) % users.length);
      attendance.push({
        user_uid: user.uid,
        username: user.username,
        type: 'checkin',
        timestamp: atDayHour(day, hour, minute + (n % 7)),
        is_manual: n === 0 && day === 2,
      });
      if (n % 3 === 0) {
        attendance.push({
          user_uid: user.uid,
          username: user.username,
          type: 'checkout',
          timestamp: atDayHour(day, Math.min(19, hour + 8), minute),
          is_manual: false,
        });
      }
    }
  }

  /* One open shift in the last week (check-in without checkout) */
  attendance.push({
    user_uid: pick(4).uid,
    username: pick(4).username,
    type: 'checkin',
    timestamp: atDayHour(2, 9, 0),
    is_manual: false,
  });

  const leaves = [
    {
      id: 'mock-leave-1',
      status: 'pending',
      leave_type: 'annual',
      employee_name: pick(8).name,
      username: pick(8).username,
      user_uid: pick(8).uid,
      start_date: atDayHour(0, 0, 0).slice(0, 10),
      end_date: atDayHour(-1, 0, 0).slice(0, 10),
      days: 2,
      requested_at: atDayHour(3, 10, 0),
      reason: 'Family travel',
    },
    {
      id: 'mock-leave-2',
      status: 'approved',
      leave_type: 'sick',
      employee_name: pick(8).name,
      username: pick(8).username,
      user_uid: pick(8).uid,
      start_date: atDayHour(0, 0, 0).slice(0, 10),
      end_date: atDayHour(0, 0, 0).slice(0, 10),
      days: 1,
      requested_at: atDayHour(1, 8, 0),
      processed_at: atDayHour(1, 9, 30),
    },
  ];

  const workModes = [
    {
      id: 'mock-wm-1',
      status: 'pending',
      employee_name: pick(2).name,
      username: pick(2).username,
      user_uid: pick(2).uid,
      current_work_mode: 'semi_remote',
      requested_work_mode: 'fully_remote',
      requested_at: atDayHour(5, 14, 0),
      reason: 'Client timezone overlap',
    },
  ];

  const stats = {
    totalEmployees: users.length,
    activeUsers: users.filter((u) => u.is_active !== false).length,
    totalDepartments: new Set(users.map((u) => u.department).filter(Boolean)).size,
    pendingLeaves: leaves.filter((l) => l.status === 'pending').length,
    attendanceRecords: attendance.length,
  };

  const activity = [
    {
      ts: atDayHour(0, 10, 18),
      kind: 'checkin',
      person: pick(7).name,
      action: 'Checked in · remote',
    },
    {
      ts: atDayHour(0, 9, 41),
      kind: 'checkin',
      person: pick(5).name,
      action: 'Checked in · late',
    },
    {
      ts: atDayHour(0, 9, 5),
      kind: 'checkin',
      person: pick(2).name,
      action: 'Checked in · hybrid',
    },
    {
      ts: atDayHour(0, 11, 5),
      kind: 'manual',
      person: pick(0).name,
      action: 'Manual check-in by admin',
    },
    {
      ts: atDayHour(1, 9, 30),
      kind: 'leave',
      person: pick(8).name,
      action: 'Sick leave approved',
    },
  ];

  return { users, attendance, leaves, workModes, stats, activity };
}
