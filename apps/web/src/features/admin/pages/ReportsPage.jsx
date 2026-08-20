import { useCallback, useEffect, useState } from 'react';
import { Download, Eye, FileText, Send, Trash2, X } from 'lucide-react';
import { GlassCard } from '../../../shared/components/GlassCard';
import { GlassTable, TableActions, TableCell, TableRow } from '../../../shared/components/GlassTable';
import { Button } from '../../../shared/components/ui/Button';
import { EmptyStateBody } from '../../../shared/components/ui/EmptyState';
import { SkeletonFeed, SkeletonForm } from '../../../shared/components/ui/Skeleton';
import { PermissionGate } from '../../../shared/components/PermissionGate';
import { adminService } from '../services/adminService';
import { PERMISSIONS } from '../permissions';

const RANGE_OPTIONS = [
  { value: 'daily', label: 'Daily (today)' },
  { value: 'weekly', label: 'Weekly (last 7 days)' },
  { value: 'monthly', label: 'Monthly (previous month)' },
  { value: 'yearly', label: 'Yearly (previous year)' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom date range' },
];

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(email) {
  return EMAIL_RE.test(String(email || '').trim());
}

function scheduleSummary(frequency, day) {
  if (frequency === 'daily') return 'daily at 02:00 UTC';
  if (frequency === 'weekly') return 'every Monday at 02:00 UTC';
  return `monthly on the ${ordinal(day)} at 02:00 UTC`;
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function formatFileSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ReportStatus({ value }) {
  const normalized = String(value || '').toLowerCase().replace(/_/g, ' ');
  const tone = ['sent', 'complete', 'completed', 'success', 'delivered', 'ready'].includes(normalized)
    ? 'bg-emerald-500'
    : ['failed', 'error', 'rejected'].includes(normalized)
      ? 'bg-rose-500'
      : ['pending', 'queued', 'processing', 'in progress'].includes(normalized)
        ? 'bg-amber-400'
        : 'bg-slate-400';
  const label = normalized ? normalized.charAt(0).toUpperCase() + normalized.slice(1) : '—';

  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-caption text-ink-muted">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} aria-hidden />
      {label}
    </span>
  );
}


function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function Alert({ ok, message }) {
  if (!message) return null;
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${ok ? 'border-green-300/25 bg-green-500/15 text-green-100' : 'border-red-300/25 bg-red-500/15 text-red-100'}`}>
      {message}
    </div>
  );
}

export function ReportsPage() {
  const [reportRange, setReportRange] = useState('monthly');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [generating, setGenerating] = useState(false);
  const [emailing, setEmailing] = useState(false);
  const [actionResult, setActionResult] = useState(null);
  const [latestReport, setLatestReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [rowAction, setRowAction] = useState(null);

  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleDay, setScheduleDay] = useState(1);
  const [autoSend, setAutoSend] = useState(true);
  const [frequency, setFrequency] = useState('monthly');
  const [recipients, setRecipients] = useState([]);
  const [customRecipients, setCustomRecipients] = useState([]);
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  const [recipientError, setRecipientError] = useState('');
  const [deliveryLogs, setDeliveryLogs] = useState([]);
  const [deliveryLogsLoading, setDeliveryLogsLoading] = useState(true);
  const [scheduleMeta, setScheduleMeta] = useState({});
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleResult, setScheduleResult] = useState(null);

  const buildPayload = () => {
    const payload = { range: reportRange };
    if (reportRange === 'custom') {
      payload.from = customFrom;
      payload.to = customTo;
    }
    return payload;
  };

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const [reports, latest] = await Promise.all([
        adminService.getReportHistory().catch(() => []),
        adminService.getLatestReport().catch(() => null),
      ]);
      setHistory(reports || []);
      setLatestReport(latest);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadDeliveryLogs = useCallback(async () => {
    setDeliveryLogsLoading(true);
    try {
      const logs = await adminService.getReportDeliveryLogs().catch(() => []);
      setDeliveryLogs(logs || []);
    } catch {
      setDeliveryLogs([]);
    } finally {
      setDeliveryLogsLoading(false);
    }
  }, []);

  const loadSchedule = useCallback(async () => {
    setScheduleLoading(true);
    try {
      const schedule = await adminService.getReportSchedule();
      if (schedule) {
        setScheduleDay(schedule.day ?? 1);
        setAutoSend(schedule.autoSend ?? true);
        setFrequency(schedule.frequency ?? 'monthly');
        setRecipients(schedule.recipients || []);
        setCustomRecipients(schedule.customRecipients || []);
        setScheduleMeta({
          lastExecution: schedule.lastExecution,
          lastStatus: schedule.lastStatus,
          nextExecution: schedule.nextExecution,
        });
      }
    } catch {
      /* defaults */
    } finally {
      setScheduleLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
    loadSchedule();
    loadDeliveryLogs();
  }, [loadHistory, loadSchedule, loadDeliveryLogs]);

  async function handleGeneratePdf() {
    if (reportRange === 'custom' && (!customFrom || !customTo)) {
      setActionResult({ ok: false, message: 'Please select both start and end dates for a custom range.' });
      return;
    }
    setGenerating(true);
    setActionResult(null);
    try {
      const res = await adminService.generateReportPdf(buildPayload());
      setActionResult({ ok: true, message: res.message || 'Report generated successfully.', reportId: res.reportId });
      await loadHistory();
    } catch (err) {
      setActionResult({ ok: false, message: err.message || 'PDF generation failed.' });
    } finally {
      setGenerating(false);
    }
  }

  async function handleGenerateAndEmail() {
    if (reportRange === 'custom' && (!customFrom || !customTo)) {
      setActionResult({ ok: false, message: 'Please select both start and end dates for a custom range.' });
      return;
    }
    setEmailing(true);
    setActionResult(null);
    try {
      const res = await adminService.generateAndEmailReport(buildPayload());
      setActionResult({ ok: true, message: res.message, reportId: res.reportId });
      await loadHistory();
    } catch (err) {
      setActionResult({ ok: false, message: err.message || 'Failed to generate and email report.' });
    } finally {
      setEmailing(false);
    }
  }

  async function handlePreview(reportId) {
    setRowAction(reportId);
    try {
      await adminService.previewReport(reportId);
    } catch (err) {
      setActionResult({ ok: false, message: err.message || 'Unable to preview report.' });
    } finally {
      setRowAction(null);
    }
  }

  async function handleDownload(report) {
    setRowAction(report.reportId);
    try {
      const name = `${report.reportType}_Report_${(report.periodLabel || 'report').replace(/[^a-z0-9]+/gi, '_')}.pdf`;
      await adminService.downloadReportFile(report.reportId, name);
    } catch (err) {
      setActionResult({ ok: false, message: err.message || 'Download failed.' });
    } finally {
      setRowAction(null);
    }
  }

  async function handleResend(reportId) {
    setRowAction(reportId);
    try {
      await adminService.resendReportEmail(reportId);
      setActionResult({ ok: true, message: 'Report emailed successfully.' });
      await loadHistory();
    } catch (err) {
      setActionResult({ ok: false, message: err.message || 'Email failed.' });
    } finally {
      setRowAction(null);
    }
  }

  async function handleDelete(reportId) {
    if (!window.confirm('Delete this report permanently?')) return;
    setRowAction(reportId);
    try {
      await adminService.deleteReport(reportId);
      setActionResult({ ok: true, message: 'Report deleted.' });
      await loadHistory();
    } catch (err) {
      setActionResult({ ok: false, message: err.message || 'Failed to delete report.' });
    } finally {
      setRowAction(null);
    }
  }

  function addRecipientEmail() {
    const email = newRecipientEmail.trim();
    setRecipientError('');
    if (!email) {
      setRecipientError('Enter an email address.');
      return;
    }
    if (!isValidEmail(email)) {
      setRecipientError('Enter a valid email address.');
      return;
    }
    if (customRecipients.some((r) => r.toLowerCase() === email.toLowerCase())) {
      setRecipientError('This email is already in the list.');
      return;
    }
    setCustomRecipients((prev) => [...prev, email]);
    setNewRecipientEmail('');
  }

  function removeRecipientEmail(email) {
    setCustomRecipients((prev) => prev.filter((r) => r !== email));
  }

  async function handleSaveSchedule() {
    if (autoSend && frequency === 'monthly' && (scheduleDay < 1 || scheduleDay > 28)) {
      setScheduleResult({ ok: false, message: 'Day of month must be between 1 and 28.' });
      return;
    }

    setScheduleSaving(true);
    setScheduleResult(null);
    setRecipientError('');
    try {
      const updated = await adminService.updateReportSchedule({
        day: scheduleDay,
        autoSend,
        frequency,
        recipients: customRecipients,
      });
      setRecipients(updated.recipients || []);
      setCustomRecipients(updated.customRecipients || customRecipients);
      setScheduleMeta({
        lastExecution: updated.lastExecution,
        lastStatus: updated.lastStatus,
        nextExecution: updated.nextExecution,
      });
      setScheduleResult({
        ok: true,
        message: autoSend
          ? `Schedule saved: ${scheduleSummary(frequency, scheduleDay)}`
          : 'Auto-send disabled',
      });
      await loadDeliveryLogs();
    } catch (err) {
      setScheduleResult({ ok: false, message: err.message || 'Failed to save schedule.' });
    } finally {
      setScheduleSaving(false);
    }
  }

  const busy = generating || emailing;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold text-white">Reports</h1>
        <p className="mt-1 text-sm text-slate-300">Generate, preview, download, and schedule attendance reports.</p>
      </div>

      <PermissionGate permission={PERMISSIONS.EXPORT_REPORTS}>
        {/* Generate Reports */}
        <GlassCard className="p-5 space-y-4">
          <div>
            <h2 className="text-base font-medium text-white">Generate Reports</h2>
            <p className="text-xs text-slate-300 mt-1">Create PDF reports without requiring email delivery.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-slate-300">Report type</label>
              <select
                value={reportRange}
                onChange={(e) => setReportRange(e.target.value)}
                className="ui-select"
              >
                {RANGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-slate-800">{opt.label}</option>
                ))}
              </select>
            </div>

            {reportRange === 'custom' && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-300">From</label>
                  <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                    className="ui-input" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-300">To</label>
                  <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                    className="ui-input" />
                </div>
              </>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={handleGeneratePdf} disabled={busy} loading={generating}>
              <FileText strokeWidth={2} aria-hidden />
              Generate PDF
            </Button>

            <Button variant="secondary" onClick={handleGenerateAndEmail} disabled={busy} loading={emailing}>
              <Send strokeWidth={2} aria-hidden />
              Generate &amp; Email Report
            </Button>

            {latestReport && (
              <>
                <button onClick={() => handlePreview(latestReport.reportId)} disabled={!!rowAction}
                  className="ui-btn-secondary ui-btn-sm">
                  Preview Report
                </button>
                <button onClick={() => handleDownload(latestReport)} disabled={!!rowAction}
                  className="ui-btn-secondary ui-btn-sm">
                  Download Latest
                </button>
              </>
            )}
          </div>

          <Alert {...(actionResult || {})} />
          {generating && (
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <Spinner /> Building report data and PDF — large reports may take up to a minute.
            </p>
          )}
        </GlassCard>

        {/* Scheduled Reports */}
        <GlassCard className="p-5 space-y-5">
          <div>
            <h2 className="text-base font-medium text-white">Scheduled Reports</h2>
            <p className="text-xs text-slate-300 mt-1">Configure automatic delivery. Super admin emails are always included.</p>
          </div>

          {scheduleLoading ? (
            <SkeletonForm fields={3} />
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-200 cursor-pointer shrink-0">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoSend}
                    onClick={() => setAutoSend((v) => !v)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-fast ease-premium ${autoSend ? 'bg-accent-600' : 'bg-surface-sunken'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${autoSend ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  Enable auto reports
                </label>
              </div>

              <div className={`grid gap-4 sm:grid-cols-2 ${autoSend ? '' : 'opacity-40 pointer-events-none'}`}>
                <div className="flex flex-col gap-1 min-w-0">
                  <label className="text-xs text-slate-300">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="ui-select w-full"
                  >
                    {FREQUENCY_OPTIONS.map((f) => (
                      <option key={f.value} value={f.value} className="bg-slate-800">{f.label}</option>
                    ))}
                  </select>
                </div>

                {frequency === 'monthly' && (
                  <div className="flex flex-col gap-1 min-w-0">
                    <label className="text-xs text-slate-300">Day of month (1–28)</label>
                    <select
                      value={scheduleDay}
                      onChange={(e) => setScheduleDay(Number(e.target.value))}
                      className="ui-select w-full"
                    >
                      {DAY_OPTIONS.map((d) => (
                        <option key={d} value={d} className="bg-slate-800">{ordinal(d)}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-300">Additional recipient emails</label>
                  <p className="text-xs text-slate-400 mt-0.5">Saved per company. Super admin addresses are always included.</p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <input
                    type="email"
                    value={newRecipientEmail}
                    onChange={(e) => { setNewRecipientEmail(e.target.value); setRecipientError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRecipientEmail(); } }}
                    placeholder="name@company.com"
                    className="ui-input flex-1 min-w-0"
                  />
                  <button
                    type="button"
                    onClick={addRecipientEmail}
                    className="ui-btn-secondary ui-btn-sm shrink-0"
                  >
                    Add email
                  </button>
                </div>
                {recipientError && <p className="text-xs text-red-300">{recipientError}</p>}

                <div className="flex flex-wrap gap-2">
                  {customRecipients.length === 0 ? (
                    <p className="text-caption text-ink-muted">No additional recipients. Add emails above and save.</p>
                  ) : (
                    customRecipients.map((email) => (
                      <span key={email} className="ui-badge ui-badge-lg ui-badge-neutral pr-1">
                        {email}
                        <button
                          type="button"
                          onClick={() => removeRecipientEmail(email)}
                          className="grid h-4 w-4 place-items-center rounded-full text-ink-muted transition-colors duration-fast hover:bg-danger-surface hover:text-danger-ink"
                          aria-label={`Remove ${email}`}
                        >
                          <X className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {recipients.length > 0 && (
                  <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
                    <p className="text-slate-400 mb-1">All delivery recipients ({recipients.length})</p>
                    <p className="break-words">{recipients.join(', ')}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={handleSaveSchedule} loading={scheduleSaving}>
                  Save Schedule
                </Button>
              </div>
            </div>
          )}

          <Alert {...(scheduleResult || {})} />
        </GlassCard>

        {/* Current Schedule */}
        <GlassCard className="p-5 space-y-3">
          <h2 className="text-base font-medium text-white">Current Schedule</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs text-slate-400">Auto send</p>
              <p className="text-white mt-1">{autoSend ? 'Enabled' : 'Disabled'}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs text-slate-400">Frequency</p>
              <p className="text-white mt-1 capitalize">{frequency}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs text-slate-400">Next execution</p>
              <p className="text-white mt-1">{formatDateTime(scheduleMeta.nextExecution)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs text-slate-400">Last execution</p>
              <p className="text-white mt-1">{formatDateTime(scheduleMeta.lastExecution)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs text-slate-400">Last status</p>
              <p className="text-white mt-1 capitalize">{scheduleMeta.lastStatus || '—'}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs text-slate-400">Recipients</p>
              <p className="text-white mt-1">{recipients.length} total</p>
            </div>
          </div>
        </GlassCard>

        {/* Delivery status */}
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-white">Delivery Status</h2>
              <p className="text-xs text-slate-300 mt-1">Recent scheduled and manual email deliveries.</p>
            </div>
            <button onClick={loadDeliveryLogs} disabled={deliveryLogsLoading}
              className="ui-btn-secondary ui-btn-sm">
              Refresh
            </button>
          </div>

          {deliveryLogsLoading ? (
            <SkeletonFeed count={3} />
          ) : deliveryLogs.length === 0 ? (
            <EmptyStateBody
              size="sm"
              icon={Send}
              title="No deliveries yet"
              description="Once a report is emailed — on schedule or on demand — every attempt is logged here with its recipients."
              className="py-8"
            />
          ) : (
            <div className="max-h-64 divide-y divide-hairline-soft overflow-y-auto">
              {deliveryLogs.map((log) => (
                <div key={log.id} className="px-1 py-2.5 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <ReportStatus value={log.status} />
                    <span className="text-caption text-ink-muted">{formatDateTime(log.created_at)}</span>
                  </div>
                  {log.report_period && <p className="mt-1 text-caption text-ink">{log.report_period}</p>}
                  {log.recipients?.length > 0 && (
                    <p className="mt-1 break-words text-caption text-ink-muted">
                      To: {Array.isArray(log.recipients) ? log.recipients.join(', ') : log.recipients}
                    </p>
                  )}
                  {log.error_message && (
                    <p className="mt-1 text-caption font-medium text-danger-ink">{log.error_message}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Report History */}
        <GlassCard className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-medium text-white">Report History</h2>
              <p className="text-xs text-slate-300 mt-1">Previously generated reports for your company.</p>
            </div>
            <button onClick={loadHistory} disabled={historyLoading}
              className="ui-btn-secondary ui-btn-sm">
              Refresh
            </button>
          </div>

          <GlassTable
            loading={historyLoading}
            skeletonRows={4}
            emptyIcon={FileText}
            emptyTitle="No reports yet"
            emptyMessage="Generated reports will appear here with their delivery status."
            columns={[
              { key: 'id', label: 'Report', className: 'w-40' },
              { key: 'by', label: 'Generated by' },
              { key: 'at', label: 'Generated at' },
              { key: 'type', label: 'Type' },
              { key: 'status', label: 'Status' },
              { key: 'size', label: 'PDF' },
              { key: 'email', label: 'Email' },
              { key: 'actions', label: <span className="sr-only">Actions</span>, className: 'w-16' },
            ]}
          >
            {history.map((r) => (
              <TableRow key={r.reportId}>
                <TableCell>
                  <span className="font-mono text-caption text-ink-muted">{r.reportId.slice(0, 8)}…</span>
                  <span className="block truncate text-caption text-ink-faint">{r.companyName}</span>
                </TableCell>
                <TableCell className="text-ink-muted">{r.generatedBy}</TableCell>
                <TableCell className="whitespace-nowrap text-caption text-ink-muted">
                  {formatDateTime(r.generatedAt)}
                </TableCell>
                <TableCell className="capitalize">{r.reportType}</TableCell>
                <TableCell><ReportStatus value={r.generationStatus} /></TableCell>
                <TableCell className="text-ink-muted">{formatFileSize(r.fileSize)}</TableCell>
                <TableCell><ReportStatus value={r.emailStatus} /></TableCell>
                <TableCell>
                  <TableActions
                    label={`Actions for report ${r.reportId.slice(0, 8)}`}
                    items={[
                      { label: 'View', icon: Eye, disabled: rowAction === r.reportId, onClick: () => handlePreview(r.reportId) },
                      { label: 'Download', icon: Download, disabled: rowAction === r.reportId, onClick: () => handleDownload(r) },
                      { label: 'Resend email', icon: Send, disabled: rowAction === r.reportId, onClick: () => handleResend(r.reportId) },
                      {
                        label: 'Delete',
                        icon: Trash2,
                        tone: 'danger',
                        disabled: rowAction === r.reportId,
                        onClick: () => handleDelete(r.reportId),
                      },
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))}
          </GlassTable>
        </GlassCard>
      </PermissionGate>
    </div>
  );
}
