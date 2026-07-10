/**
 * Scheduled Report Job — generates and emails reports per company schedule
 * Cron: daily at 02:00 UTC; each company's frequency/day is checked at runtime.
 */
const cron = require('node-cron');
const { buildReport } = require('../services/reportBuilder');
const {
  getAllCompanies,
  getReportSchedule,
  logReportAudit,
  recordScheduleRun,
} = require('../services/queryService');
const { shouldRunScheduledReport } = require('../services/scheduleConfig');

let isRunning = false;

function rangeForFrequency(frequency) {
  switch (frequency) {
    case 'daily':
      return 'daily';
    case 'weekly':
      return 'weekly';
    case 'monthly':
    default:
      return 'monthly';
  }
}

async function processCompany(company, range = 'monthly') {
  const companyId = company.id;
  const companyName = company.name || `Company ${companyId.slice(0, 8)}`;
  const ts = () => new Date().toISOString();

  console.log(`[${ts()}] ── Processing company: "${companyName}" (${companyId})`);

  try {
    const result = await buildReport({
      range,
      companyId,
      companyName,
      generatedBy: 'Hadir.AI Scheduled Reports',
      sendEmail: true,
    });

    if (result.record.emailStatus === 'sent') {
      await logReportAudit({
        companyId,
        companyName,
        reportPeriod: result.periodLabel,
        recipients: result.recipients || [],
        status: 'sent',
      });
      await recordScheduleRun(companyId, 'sent');
      console.log(`[${ts()}]   ✓ Scheduled report sent for ${companyName}`);
      return { companyId, companyName, status: 'sent', reportId: result.reportId };
    }

    if (result.record.emailStatus === 'skipped') {
      const msg = 'No valid recipient email addresses — skipping';
      await logReportAudit({ companyId, companyName, status: 'skipped', errorMessage: msg });
      await recordScheduleRun(companyId, 'skipped');
      return { companyId, companyName, status: 'skipped' };
    }

    const msg = result.record.emailError || 'Email delivery failed';
    await logReportAudit({
      companyId,
      companyName,
      reportPeriod: result.periodLabel,
      recipients: result.recipients || [],
      status: 'failed',
      errorMessage: msg,
    });
    await recordScheduleRun(companyId, 'failed');
    return { companyId, companyName, status: 'error', error: msg };
  } catch (err) {
    const msg = err.message || 'Report generation failed';
    console.error(`[${ts()}]   ✗ ${companyName}: ${msg}`);
    await logReportAudit({ companyId, companyName, status: 'failed', errorMessage: msg });
    await recordScheduleRun(companyId, 'failed');
    return { companyId, companyName, status: 'error', error: msg };
  }
}

async function generateScheduledReports(force = false) {
  if (isRunning) {
    console.log('⚠ Scheduled report job is already running. Skipping...');
    return;
  }

  isRunning = true;
  const ts = () => new Date().toISOString();
  console.log(`\n[${ts()}] ══════════════════════════════════════════`);
  console.log(`[${ts()}] Starting scheduled report job`);
  console.log(`[${ts()}] ══════════════════════════════════════════`);

  try {
    const companies = await getAllCompanies();

    if (companies.length === 0) {
      console.warn(`[${ts()}] No companies found — nothing to report`);
      return;
    }

    console.log(`[${ts()}] Companies to process: ${companies.length}${force ? ' (forced send)' : ''}`);
    const results = { sent: [], skipped: [], errors: [] };

    for (const company of companies) {
      const schedule = await getReportSchedule(company.id);

      if (!force) {
        if (!schedule.autoSend) {
          console.log(`[${ts()}]   ⏸ ${company.name || company.id}: auto-send disabled — skipping`);
          results.skipped.push(company.name || company.id);
          continue;
        }
        if (!shouldRunScheduledReport(schedule)) {
          console.log(`[${ts()}]   ⏳ ${company.name || company.id}: not scheduled for today (${schedule.frequency}) — skipping`);
          results.skipped.push(company.name || company.id);
          continue;
        }
      }

      const range = rangeForFrequency(schedule.frequency);
      const result = await processCompany(company, range);
      if (result.status === 'sent') results.sent.push(result.companyName);
      else if (result.status === 'skipped') results.skipped.push(result.companyName);
      else results.errors.push(`${result.companyName}: ${result.error}`);
    }

    console.log(`\n[${ts()}] ── Scheduled report job complete ───────`);
    console.log(`[${ts()}]   ✓ Sent     (${results.sent.length}): ${results.sent.join(', ') || 'none'}`);
    console.log(`[${ts()}]   ⚠ Skipped  (${results.skipped.length}): ${results.skipped.join(', ') || 'none'}`);
    console.log(`[${ts()}]   ✗ Errors   (${results.errors.length}): ${results.errors.join(' | ') || 'none'}`);
    console.log(`[${ts()}] ─────────────────────────────────────────\n`);
  } catch (error) {
    console.error(`[${ts()}] ✗ Fatal error in scheduled report job:`, error);
  } finally {
    isRunning = false;
  }
}

function startMonthlyReportJob() {
  cron.schedule('0 2 * * *', async () => {
    await generateScheduledReports(false);
  }, {
    scheduled: true,
    timezone: 'UTC',
  });

  console.log('✓ Scheduled report job: daily at 02:00 UTC (per-company frequency/day checked at runtime)');
}

async function triggerMonthlyReport() {
  await generateScheduledReports(true);
}

async function triggerReportForCompany(companyId) {
  const { getCompany } = require('../services/queryService');
  const company = await getCompany(companyId);
  if (!company) throw new Error(`Company ${companyId} not found`);
  const schedule = await getReportSchedule(companyId);
  const range = rangeForFrequency(schedule.frequency);
  return processCompany(company, range);
}

module.exports = {
  startMonthlyReportJob,
  triggerMonthlyReport,
  triggerReportForCompany,
  generateMonthlyReport: generateScheduledReports,
  generateScheduledReports,
};
