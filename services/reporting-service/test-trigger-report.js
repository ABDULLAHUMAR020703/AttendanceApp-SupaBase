/**
 * Test Script: Trigger Monthly Report Manually
 * 
 * Usage:
 *   node test-trigger-report.js
 * 
 * This script manually triggers the monthly report generation
 * for testing purposes without waiting for the cron job.
 */
require('dotenv').config();
const { triggerMonthlyReport } = require('./jobs/monthlyReportJob');

console.log('========================================');
console.log('  Testing Monthly Report Generation');
console.log('========================================');
console.log('');

const timestamp = new Date().toISOString();
console.log(`[${timestamp}] Starting manual report trigger...`);

triggerMonthlyReport()
  .then(() => {
    console.log(`[${timestamp}] ✓ Report generation completed successfully`);
    console.log('Check your email for the report.');
    process.exit(0);
  })
  .catch((error) => {
    console.error(`[${timestamp}] ✗ Report generation failed:`, error);
    process.exit(1);
  });

