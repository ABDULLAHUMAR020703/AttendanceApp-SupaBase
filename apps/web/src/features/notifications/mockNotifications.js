const minutesAgo = (mins) => new Date(Date.now() - mins * 60 * 1000).toISOString();

const SEED = [
  {
    id: 'mock-unread-ticket',
    title: 'New ticket from Sara Khan',
    body: 'Printer on Floor 3 is jammed and blocking checkout for the morning shift.',
    type: 'ticket_created',
    read: false,
    created_at: minutesAgo(12),
    data: { ticketId: 'mock-ticket-1' },
  },
  {
    id: 'mock-unread-leave',
    title: 'Leave request needs review',
    body: 'Ahmed Ali requested 3 days of annual leave (18–20 Aug).',
    type: 'leave_request',
    read: false,
    created_at: minutesAgo(46),
    data: { leaveId: 'mock-leave-1' },
  },
  {
    id: 'mock-unread-work-mode',
    title: 'Remote work request',
    body: 'Fatima Noor asked to work remotely this Thursday.',
    type: 'work_mode',
    read: false,
    created_at: minutesAgo(90),
    data: {},
  },
  {
    id: 'mock-unread-approval',
    title: 'Approval waiting on you',
    body: 'Department change for Yusuf Malik is queued at your step.',
    type: 'approval',
    read: false,
    created_at: minutesAgo(180),
    data: {},
  },
  {
    id: 'mock-read-assigned',
    title: 'Ticket assigned to you',
    body: 'Access badge request for Building B was assigned to your queue.',
    type: 'ticket_assigned',
    read: true,
    created_at: minutesAgo(60 * 8),
    data: { ticketId: 'mock-ticket-2' },
  },
  {
    id: 'mock-read-calendar',
    title: 'Team huddle tomorrow',
    body: 'Weekly attendance review is on the calendar at 10:00.',
    type: 'calendar_event',
    read: true,
    created_at: minutesAgo(60 * 22),
    data: { eventId: 'mock-event-1' },
  },
  {
    id: 'mock-read-general',
    title: 'Geofence radius updated',
    body: 'Head office check-in radius is now 120 meters.',
    type: 'general',
    read: true,
    created_at: minutesAgo(60 * 36),
    data: {},
  },
];

export const MOCK_NOTIFICATION_ID_PREFIX = 'mock-';

export function isMockNotificationId(id) {
  return String(id || '').startsWith(MOCK_NOTIFICATION_ID_PREFIX);
}

let inbox = SEED.map((item) => ({ ...item }));
let fallbackActive = false;

export function setMockFallbackActive(active) {
  fallbackActive = Boolean(active);
}

export function isMockFallbackActive() {
  return fallbackActive;
}

export function resetMockNotifications() {
  inbox = SEED.map((item) => ({ ...item }));
}

export function queryMockNotifications({ page = 1, limit = 20, read, type } = {}) {
  let rows = inbox;
  if (read === true || read === 'true') rows = rows.filter((item) => item.read);
  if (read === false || read === 'false') rows = rows.filter((item) => !item.read);
  if (type) rows = rows.filter((item) => item.type === type);
  const total = rows.length;
  const start = Math.max(0, (page - 1) * limit);
  return { data: rows.slice(start, start + limit), total };
}

export function countMockUnread() {
  return inbox.filter((item) => !item.read).length;
}

export function markMockNotificationRead(id) {
  inbox = inbox.map((item) => (item.id === id ? { ...item, read: true } : item));
}

export function markAllMockNotificationsRead() {
  inbox = inbox.map((item) => ({ ...item, read: true }));
}

export function deleteMockNotification(id) {
  inbox = inbox.filter((item) => item.id !== id);
}
