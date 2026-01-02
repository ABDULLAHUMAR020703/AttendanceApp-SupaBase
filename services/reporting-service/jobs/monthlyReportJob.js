/**
 * Monthly Report Job - Automatically generates and emails monthly reports
 * Runs on the 1st of every month at 2 AM
 */
const cron = require('node-cron');
const { generateReportData } = require('../services/reportFormatter');
const { generatePDF } = require('../services/pdfGenerator');
const { savePDFToFile, deletePDFFile } = require('../services/pdfGenerator');
const { sendReportEmail, generateMonthlyReportEmailBody } = require('../services/emailService');
const { getSuperAdminEmail } = require('../services/queryService');
const { getMonthName } = require('../utils/dateUtils');

let isRunning = false;

/**
 * Generate and send monthly report
 */
async function generateMonthlyReport() {
  if (isRunning) {
    console.log('⚠ Monthly report job is already running. Skipping...');
    return;
  }

  isRunning = true;
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Starting monthly report generation...`);

  try {
    // Generate report for previous month
    const reportData = await generateReportData('monthly');
    
    console.log(`[${timestamp}] Report data generated successfully`);
    console.log(`[${timestamp}] Period: ${reportData.period.label}`);
    console.log(`[${timestamp}] Total Employees: ${reportData.overall.totalEmployees}`);

    // Generate PDF
    const pdfBuffer = await generatePDF(reportData);
    console.log(`[${timestamp}] PDF generated successfully (${pdfBuffer.length} bytes)`);

    // Save PDF to temporary file
    const now = new Date();
    const monthName = getMonthName(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const filename = `monthly-report-${monthName.toLowerCase()}-${now.getFullYear()}.pdf`;
    const pdfPath = await savePDFToFile(pdfBuffer, filename);
    console.log(`[${timestamp}] PDF saved to: ${pdfPath}`);

    // Get super admin email
    const superAdminEmail = await getSuperAdminEmail();
    if (!superAdminEmail) {
      throw new Error('Super admin email not found');
    }

    // Generate email content
    const emailSubject = `Monthly Attendance Report - ${reportData.period.label}`;
    const emailBody = generateMonthlyReportEmailBody(reportData);

    // Send email
    await sendReportEmail(superAdminEmail, emailSubject, emailBody, pdfPath, filename);
    console.log(`[${timestamp}] ✓ Monthly report sent successfully to ${superAdminEmail}`);

    // Clean up temporary file
    deletePDFFile(pdfPath);
    console.log(`[${timestamp}] Temporary PDF file deleted`);

  } catch (error) {
    console.error(`[${timestamp}] ✗ Error generating monthly report:`, error);
    // Don't throw - allow job to complete and retry next month
  } finally {
    isRunning = false;
  }
}

/**
 * Start the monthly report cron job
 * Runs on the 1st of every month at 2 AM
 */
function startMonthlyReportJob() {
  // Cron expression: "0 2 1 * *" = At 02:00 on day-of-month 1
  cron.schedule('0 2 1 * *', async () => {
    await generateMonthlyReport();
  }, {
    scheduled: true,
    timezone: 'UTC',
  });

  console.log('✓ Monthly report job scheduled: Runs on 1st of every month at 2:00 AM UTC');
}

/**
 * Manually trigger monthly report (for testing)
 */
async function triggerMonthlyReport() {
  await generateMonthlyReport();
}

module.exports = {
  startMonthlyReportJob,
  triggerMonthlyReport,
  generateMonthlyReport,
};

