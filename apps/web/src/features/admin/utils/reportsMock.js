/**
 * Preview seed for Reports — used when live history and delivery logs are empty
 * so generation/email status badges can be reviewed.
 */

const hoursAgo = (hours) => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
const hoursFromNow = (hours) => new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

export const MOCK_REPORT_HISTORY = [
  {
    reportId: 'mock-rpt-a1b2c3d4-e5f6-7890-abcd-111111111111',
    companyName: 'Hadir.ai',
    generatedBy: 'Sara Ahmed',
    generatedAt: hoursAgo(6),
    reportType: 'monthly',
    periodLabel: 'July 2026',
    generationStatus: 'completed',
    emailStatus: 'sent',
    fileSize: 248320,
  },
  {
    reportId: 'mock-rpt-a1b2c3d4-e5f6-7890-abcd-222222222222',
    companyName: 'Hadir.ai',
    generatedBy: 'System',
    generatedAt: hoursAgo(30),
    reportType: 'weekly',
    periodLabel: '11–17 Aug 2026',
    generationStatus: 'completed',
    emailStatus: 'not_sent',
    fileSize: 132480,
  },
  {
    reportId: 'mock-rpt-a1b2c3d4-e5f6-7890-abcd-333333333333',
    companyName: 'Hadir.ai',
    generatedBy: 'Omar Farooq',
    generatedAt: hoursAgo(52),
    reportType: 'monthly',
    periodLabel: 'June 2026',
    generationStatus: 'completed',
    emailStatus: 'failed',
    fileSize: 219140,
  },
  {
    reportId: 'mock-rpt-a1b2c3d4-e5f6-7890-abcd-444444444444',
    companyName: 'Hadir.ai',
    generatedBy: 'System',
    generatedAt: hoursAgo(2),
    reportType: 'daily',
    periodLabel: '18 Aug 2026',
    generationStatus: 'pending',
    emailStatus: 'not_sent',
    fileSize: 0,
  },
  {
    reportId: 'mock-rpt-a1b2c3d4-e5f6-7890-abcd-555555555555',
    companyName: 'Hadir.ai',
    generatedBy: 'Nina Ortiz',
    generatedAt: hoursAgo(78),
    reportType: 'custom',
    periodLabel: '1–15 Aug 2026',
    generationStatus: 'failed',
    emailStatus: 'not_sent',
    fileSize: 0,
  },
];

export const MOCK_DELIVERY_LOGS = [
  {
    id: 'mock-log-sent',
    status: 'sent',
    created_at: hoursAgo(6),
    report_period: 'July 2026',
    recipients: ['ops@hadir.ai', 'sara.ahmed@hadir.ai'],
  },
  {
    id: 'mock-log-failed',
    status: 'failed',
    created_at: hoursAgo(52),
    report_period: 'June 2026',
    recipients: ['finance@hadir.ai'],
    error_message: 'SMTP timed out while delivering to finance@hadir.ai',
  },
  {
    id: 'mock-log-pending',
    status: 'pending',
    created_at: hoursAgo(2),
    report_period: '18 Aug 2026',
    recipients: ['ops@hadir.ai'],
  },
  {
    id: 'mock-log-skipped',
    status: 'skipped',
    created_at: hoursAgo(30),
    report_period: '11–17 Aug 2026',
    recipients: ['ops@hadir.ai'],
    error_message: 'Auto-send is on, but no additional recipients were configured.',
  },
];

export const MOCK_SCHEDULE_META = {
  lastExecution: hoursAgo(6),
  lastStatus: 'sent',
  nextExecution: hoursFromNow(18),
};

export function isMockReportId(reportId) {
  return String(reportId || '').startsWith('mock-rpt-');
}

export function isReportingUnavailable(error) {
  const message = String(error?.message || error || '').toLowerCase();
  return (
    message.includes('unavailable') ||
    message.includes('network') ||
    message.includes('timeout') ||
    error?.response?.status === 503
  );
}

export function buildMockGeneratedReport({ range = 'monthly', emailed = false } = {}) {
  const period =
    range === 'daily'
      ? '18 Aug 2026'
      : range === 'weekly'
        ? '11–17 Aug 2026'
        : range === 'yearly'
          ? '2025'
          : range === 'all'
            ? 'All time'
            : 'July 2026';

  return {
    reportId: `mock-rpt-${Date.now().toString(16)}-generated`,
    companyName: 'Hadir.ai',
    generatedBy: 'You',
    generatedAt: new Date().toISOString(),
    reportType: range === 'custom' ? 'custom' : range,
    periodLabel: period,
    generationStatus: 'completed',
    emailStatus: emailed ? 'sent' : 'not_sent',
    fileSize: 186880,
  };
}

export function withReportHistoryFallback(reports, latest) {
  if (Array.isArray(reports) && reports.length > 0) {
    return { history: reports, latest: latest || reports[0], seeded: false };
  }
  return {
    history: MOCK_REPORT_HISTORY,
    latest: MOCK_REPORT_HISTORY[0],
    seeded: true,
  };
}

export function withDeliveryLogsFallback(logs) {
  if (Array.isArray(logs) && logs.length > 0) return logs;
  return MOCK_DELIVERY_LOGS;
}

export function withScheduleMetaFallback(meta = {}) {
  if (meta.lastStatus || meta.lastExecution) return meta;
  return { ...MOCK_SCHEDULE_META, ...meta };
}
