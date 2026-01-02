/**
 * Reports API Routes
 * Handles manual report generation requests
 */
const express = require('express');
const router = express.Router();
const { generateReportData } = require('../services/reportFormatter');
const { generatePDF, savePDFToFile, deletePDFFile } = require('../services/pdfGenerator');
const { sendReportEmail, generateManualReportEmailBody } = require('../services/emailService');
const { getSuperAdminEmail } = require('../services/queryService');
const { supabase } = require('../config/supabase');

/**
 * Middleware to verify super admin role
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Next middleware
 */
async function verifySuperAdmin(req, res, next) {
  try {
    // Get user from request (should be set by auth middleware)
    const userId = req.headers['x-user-id'];
    const userEmail = req.headers['x-user-email'];

    if (!userId && !userEmail) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User authentication required',
      });
    }

    // Query user from database to verify role
    let query = supabase.from('users').select('role, uid, id').eq('is_active', true);
    
    if (userId) {
      // Try both uid and id fields
      query = query.or(`uid.eq.${userId},id.eq.${userId}`);
    } else if (userEmail) {
      query = query.eq('email', userEmail);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'User not found or inactive',
      });
    }

    if (data.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Only super admins can generate reports',
      });
    }

    // User is verified as super admin
    req.user = data;
    next();
  } catch (error) {
    console.error('Error verifying super admin:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to verify user permissions',
    });
  }
}

/**
 * Generate report
 * POST /api/reports/generate
 * 
 * Request body:
 * {
 *   "range": "weekly | monthly | yearly | all | custom",
 *   "from": "2026-01-01", // Optional, required for custom
 *   "to": "2026-01-31"     // Optional, required for custom
 * }
 */
router.post('/generate', verifySuperAdmin, async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Received report generation request:`, req.body);

  try {
    const { range, from, to } = req.body;

    // Validate range
    const validRanges = ['weekly', 'monthly', 'yearly', 'all', 'custom'];
    if (!range || !validRanges.includes(range)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid range',
        message: `Range must be one of: ${validRanges.join(', ')}`,
      });
    }

    // Validate custom range
    if (range === 'custom' && (!from || !to)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid custom range',
        message: 'Custom range requires both "from" and "to" dates',
      });
    }

    // Generate report data (async - don't wait)
    generateReportData(range, from, to)
      .then(async (reportData) => {
        console.log(`[${timestamp}] Report data generated:`, reportData.period.label);

        try {
          // Generate PDF
          const pdfBuffer = await generatePDF(reportData);
          console.log(`[${timestamp}] PDF generated (${pdfBuffer.length} bytes)`);

          // Save PDF to temporary file
          const now = new Date();
          const filename = `report-${reportData.period.type}-${now.getTime()}.pdf`;
          const pdfPath = await savePDFToFile(pdfBuffer, filename);
          console.log(`[${timestamp}] PDF saved: ${pdfPath}`);

          // Get super admin email
          const superAdminEmail = await getSuperAdminEmail();
          if (!superAdminEmail) {
            throw new Error('Super admin email not found');
          }

          // Generate email content
          const emailSubject = `Attendance Report - ${reportData.period.label}`;
          const emailBody = generateManualReportEmailBody(reportData);

          // Send email
          await sendReportEmail(superAdminEmail, emailSubject, emailBody, pdfPath, filename);
          console.log(`[${timestamp}] ✓ Report sent successfully to ${superAdminEmail}`);

          // Clean up temporary file
          deletePDFFile(pdfPath);
        } catch (error) {
          console.error(`[${timestamp}] ✗ Error processing report:`, error);
        }
      })
      .catch((error) => {
        console.error(`[${timestamp}] ✗ Error generating report:`, error);
      });

    // Return immediately - report generation happens in background
    res.status(202).json({
      success: true,
      message: 'Report generation started. You will receive the report via email shortly.',
      timestamp: timestamp,
    });
  } catch (error) {
    console.error(`[${timestamp}] Error handling report request:`, error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to initiate report generation',
    });
  }
});

/**
 * Health check
 * GET /api/reports/health
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Reports service is running',
    timestamp: new Date().toISOString(),
  });
});

/**
 * TEST ENDPOINT: Trigger monthly report manually
 * GET /api/reports/test/monthly
 * 
 * WARNING: This is for testing only. In production, remove or protect this endpoint.
 */
router.get('/test/monthly', verifySuperAdmin, async (req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] TEST: Manual monthly report trigger requested`);
  
  try {
    const { triggerMonthlyReport } = require('../jobs/monthlyReportJob');
    
    // Trigger report generation (async - don't wait)
    triggerMonthlyReport()
      .then(() => {
        console.log(`[${timestamp}] TEST: Monthly report generation completed`);
      })
      .catch((error) => {
        console.error(`[${timestamp}] TEST: Monthly report generation failed:`, error);
      });
    
    res.status(202).json({
      success: true,
      message: 'Monthly report generation triggered. Check server logs and email for results.',
      timestamp: timestamp,
    });
  } catch (error) {
    console.error(`[${timestamp}] TEST: Error triggering monthly report:`, error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to trigger monthly report',
    });
  }
});

module.exports = router;

