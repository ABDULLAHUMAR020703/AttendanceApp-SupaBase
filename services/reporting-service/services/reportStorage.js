/**
 * Report Storage Service
 * Manages temporary report storage with expiration
 * Uses in-memory storage for simplicity (suitable for Render deployment)
 */
const { v4: uuidv4 } = require('uuid');

// In-memory storage for report metadata
// Format: { reportId: { filePath, createdAt, expiresAt, reportData } }
const reportStore = new Map();

// Report expiration time (30 minutes)
const REPORT_EXPIRATION_MS = 30 * 60 * 1000;

/**
 * Generate a unique report ID
 * @returns {string} UUID report ID
 */
function generateReportId() {
  return uuidv4();
}

/**
 * Store report metadata
 * @param {string} reportId - Report ID
 * @param {string} filePath - Path to PDF file
 * @param {Object} reportData - Report data (for reference)
 * @returns {Object} Stored report metadata
 */
function storeReport(reportId, filePath, reportData = null) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + REPORT_EXPIRATION_MS);
  
  const reportMetadata = {
    reportId,
    filePath,
    createdAt: now,
    expiresAt,
    reportData, // Store for reference (optional)
  };
  
  reportStore.set(reportId, reportMetadata);
  
  console.log(`[ReportStorage] Stored report ${reportId}, expires at ${expiresAt.toISOString()}`);
  
  return reportMetadata;
}

/**
 * Get report metadata by ID
 * @param {string} reportId - Report ID
 * @returns {Object|null} Report metadata or null if not found/expired
 */
function getReport(reportId) {
  const report = reportStore.get(reportId);
  
  if (!report) {
    return null;
  }
  
  // Check if expired
  if (new Date() > report.expiresAt) {
    console.log(`[ReportStorage] Report ${reportId} has expired`);
    reportStore.delete(reportId);
    return null;
  }
  
  return report;
}

/**
 * Delete report metadata and file
 * @param {string} reportId - Report ID
 * @param {Function} deleteFileCallback - Callback to delete the file
 * @returns {boolean} Success status
 */
function deleteReport(reportId, deleteFileCallback = null) {
  const report = reportStore.get(reportId);
  
  if (report) {
    // Delete file if callback provided
    if (deleteFileCallback && typeof deleteFileCallback === 'function') {
      try {
        deleteFileCallback(report.filePath);
      } catch (error) {
        console.error(`[ReportStorage] Error deleting file for report ${reportId}:`, error);
      }
    }
    
    reportStore.delete(reportId);
    console.log(`[ReportStorage] Deleted report ${reportId}`);
    return true;
  }
  
  return false;
}

/**
 * Clean up expired reports
 * @param {Function} deleteFileCallback - Callback to delete files
 * @returns {number} Number of reports cleaned up
 */
function cleanupExpiredReports(deleteFileCallback = null) {
  const now = new Date();
  let cleanedCount = 0;
  
  for (const [reportId, report] of reportStore.entries()) {
    if (now > report.expiresAt) {
      deleteReport(reportId, deleteFileCallback);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`[ReportStorage] Cleaned up ${cleanedCount} expired report(s)`);
  }
  
  return cleanedCount;
}

/**
 * Get all active reports (for debugging/admin)
 * @returns {Array} Array of report metadata
 */
function getAllReports() {
  cleanupExpiredReports(); // Clean up before returning
  return Array.from(reportStore.values());
}

/**
 * Get storage statistics
 * @returns {Object} Storage stats
 */
function getStorageStats() {
  cleanupExpiredReports(); // Clean up before stats
  return {
    totalReports: reportStore.size,
    activeReports: Array.from(reportStore.values()).filter(r => new Date() < r.expiresAt).length,
  };
}

module.exports = {
  generateReportId,
  storeReport,
  getReport,
  deleteReport,
  cleanupExpiredReports,
  getAllReports,
  getStorageStats,
  REPORT_EXPIRATION_MS,
};

