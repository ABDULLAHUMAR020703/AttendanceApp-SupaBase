/**
 * Preview seed for Work modes → Change requests when the live queue is empty.
 */

const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

export const MOCK_WORK_MODE_REQUESTS = [
  {
    id: 'mock-wmr-pending-hybrid',
    employee_uid: 'mock-uid-ayesha',
    current_work_mode: 'in_office',
    requested_work_mode: 'semi_remote',
    status: 'pending',
    reason: 'Two client days on-site, three days from home while the office floor is being renovated.',
    created_at: hoursAgo(6),
    requested_at: hoursAgo(6),
    employee: {
      name: 'Ayesha Khan',
      username: 'ayesha.khan',
      email: 'ayesha.khan@hadir.ai',
      department: 'Engineering',
    },
    approvalProgress: [
      { id: 'mock-step-1a', step_order: 1, step_label: 'Department manager', action: 'approved' },
      { id: 'mock-step-1b', step_order: 2, step_label: 'HR review', action: 'pending' },
    ],
  },
  {
    id: 'mock-wmr-pending-remote',
    employee_uid: 'mock-uid-daniel',
    current_work_mode: 'semi_remote',
    requested_work_mode: 'fully_remote',
    status: 'pending',
    reason: 'Relocating for the quarter; will keep core hours and weekly standup coverage.',
    created_at: hoursAgo(18),
    requested_at: hoursAgo(18),
    employee: {
      name: 'Daniel Cole',
      username: 'daniel.cole',
      email: 'daniel.cole@hadir.ai',
      department: 'Sales',
    },
    approvalProgress: [
      { id: 'mock-step-2a', step_order: 1, step_label: 'Department manager', action: 'pending' },
    ],
  },
  {
    id: 'mock-wmr-pending-office-remote',
    employee_uid: 'mock-uid-layla',
    current_work_mode: 'in_office',
    requested_work_mode: 'fully_remote',
    status: 'pending',
    reason: 'Family care for six weeks. Happy to check in daily from an approved remote location.',
    created_at: hoursAgo(2),
    requested_at: hoursAgo(2),
    employee: {
      name: 'Layla Rahman',
      username: 'layla.rahman',
      email: 'layla.rahman@hadir.ai',
      department: 'Product',
    },
    approvalProgress: [
      { id: 'mock-step-3a', step_order: 1, step_label: 'Department manager', action: 'approved' },
      { id: 'mock-step-3b', step_order: 2, step_label: 'People ops', action: 'in_review' },
    ],
  },
  {
    id: 'mock-wmr-approved-office',
    employee_uid: 'mock-uid-omar',
    current_work_mode: 'semi_remote',
    requested_work_mode: 'in_office',
    status: 'approved',
    reason: 'Project kickoff needs daily site presence for the next sprint.',
    created_at: hoursAgo(72),
    requested_at: hoursAgo(72),
    processed_at: hoursAgo(48),
    employee: {
      name: 'Omar Farooq',
      username: 'omar.farooq',
      email: 'omar.farooq@hadir.ai',
      department: 'Operations',
    },
    approvalProgress: [
      { id: 'mock-step-4a', step_order: 1, step_label: 'Department manager', action: 'approved' },
      { id: 'mock-step-4b', step_order: 2, step_label: 'HR review', action: 'approved' },
    ],
  },
  {
    id: 'mock-wmr-rejected-office',
    employee_uid: 'mock-uid-nina',
    current_work_mode: 'fully_remote',
    requested_work_mode: 'in_office',
    status: 'rejected',
    reason: 'Requesting a desk at HQ while visiting this month.',
    admin_notes: 'No assigned site capacity this month. Re-request after 1 Sep.',
    created_at: hoursAgo(96),
    requested_at: hoursAgo(96),
    processed_at: hoursAgo(80),
    employee: {
      name: 'Nina Ortiz',
      username: 'nina.ortiz',
      email: 'nina.ortiz@hadir.ai',
      department: 'Support',
    },
    approvalProgress: [
      { id: 'mock-step-5a', step_order: 1, step_label: 'Department manager', action: 'rejected' },
    ],
  },
];

export function isMockWorkModeRequestId(id) {
  return String(id || '').startsWith('mock-wmr-');
}

export function cloneMockWorkModeRequests() {
  return MOCK_WORK_MODE_REQUESTS.map((row) => ({
    ...row,
    employee: { ...row.employee },
    approvalProgress: (row.approvalProgress || []).map((step) => ({ ...step })),
  }));
}

export function applyMockWorkModeDecision(rows, id, { status, admin_notes }) {
  const now = new Date().toISOString();
  return (rows || []).map((row) => {
    if (row.id !== id) return row;
    const nextStatus = String(status || '').toLowerCase();
    return {
      ...row,
      status: nextStatus,
      admin_notes: admin_notes || row.admin_notes || '',
      processed_at: now,
      approvalProgress: (row.approvalProgress || []).map((step) => {
        const action = String(step.action || '').toLowerCase();
        if (action === 'pending' || action === 'in_review') {
          return { ...step, action: nextStatus };
        }
        return step;
      }),
    };
  });
}
