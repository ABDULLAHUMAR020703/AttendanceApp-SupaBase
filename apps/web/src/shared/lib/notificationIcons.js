import {
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  Info,
  Laptop2,
  MapPin,
  Ticket,
  UsersRound,
} from 'lucide-react';

export const NOTIFICATION_KIND_META = {
  approval: { label: 'Approvals', Icon: ClipboardCheck },
  leave: { label: 'Leave updates', Icon: CalendarClock },
  attendance: { label: 'Attendance alerts', Icon: CalendarCheck2 },
  ticket: { label: 'Tickets', Icon: Ticket },
  work_mode: { label: 'Work mode', Icon: Laptop2 },
  calendar: { label: 'Calendar', Icon: CalendarDays },
  geofence: { label: 'Geofencing', Icon: MapPin },
  user: { label: 'Users', Icon: UsersRound },
  system: { label: 'System', Icon: Info },
};

export function notificationKind(type) {
  const value = String(type || '').toLowerCase();
  if (value.includes('leave')) return 'leave';
  if (value.includes('approval')) return 'approval';
  if (value.includes('attendance') || value.includes('check_in') || value.includes('late') || value.includes('absent')) {
    return 'attendance';
  }
  if (value.startsWith('ticket')) return 'ticket';
  if (value.includes('work_mode') || value === 'remote_work') return 'work_mode';
  if (value.includes('calendar')) return 'calendar';
  if (value.includes('geofence') || value.includes('site')) return 'geofence';
  if (value.includes('signup')) return 'user';
  return 'system';
}

export function notificationKindMeta(type) {
  return NOTIFICATION_KIND_META[notificationKind(type)] || NOTIFICATION_KIND_META.system;
}
