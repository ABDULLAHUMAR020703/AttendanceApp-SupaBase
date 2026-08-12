import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { Platform, Share } from 'react-native';
import { supabase } from '../core/config/supabase';
import { getAttendanceRecords } from './storage';
import { getAllLeaveRequests, getAllEmployeesLeaveBalances } from './leaveManagement';
import { fetchSessionUserCompanyId, requireValidCompanyId } from '../core/tenant/tenantScope';

async function resolveExportCompanyId(explicitCompanyId) {
  const direct = requireValidCompanyId(explicitCompanyId, 'export');
  if (direct) return direct;
  return fetchSessionUserCompanyId(supabase);
}

async function fetchUsernameToNameMap(companyId) {
  const cid = requireValidCompanyId(companyId, 'export');
  if (!cid) return new Map();
  const { data, error } = await supabase.from('users').select('username, name, uid').eq('company_id', cid);
  if (error) {
    console.warn('[export] fetchUsernameToNameMap:', error.message);
    return new Map();
  }
  const m = new Map();
  (data || []).forEach((r) => {
    if (r.username) m.set(r.username, r.name || r.username);
    if (r.uid) m.set(r.uid, r.name || r.username);
  });
  return m;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildReportHtml({ title, subtitle, sections }) {
  const sectionHtml = sections
    .map((section) => {
      const headers = section.headers
        .map((h) => `<th>${escapeHtml(h)}</th>`)
        .join('');
      const rows =
        section.rows.length === 0
          ? `<tr><td colspan="${section.headers.length}" style="text-align:center;color:#64748b;">No data</td></tr>`
          : section.rows
              .map(
                (row) =>
                  `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
              )
              .join('');

      return `
        <h2>${escapeHtml(section.title)}</h2>
        <table>
          <thead><tr>${headers}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; padding: 24px; font-size: 11px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .subtitle { color: #64748b; margin-bottom: 20px; }
    h2 { font-size: 13px; margin: 20px 0 8px; color: #334155; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; font-weight: 600; }
    tr:nth-child(even) td { background: #f8fafc; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <div class="subtitle">${escapeHtml(subtitle)}</div>
  ${sectionHtml}
</body>
</html>`;
}

/**
 * Write HTML to a local PDF file and verify the PDF magic header.
 */
async function writeHtmlPdf(html, fileName) {
  const { uri: tempUri } = await Print.printToFileAsync({ html });
  const documentDir = FileSystem.documentDirectory;
  if (!documentDir) {
    throw new Error('Document directory is not available.');
  }

  const fileUri = `${documentDir}${fileName}`;
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (info.exists) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch (_) {
    /* ignore */
  }

  await FileSystem.copyAsync({ from: tempUri, to: fileUri });

  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists || (fileInfo.size != null && fileInfo.size < 100)) {
    throw new Error('Generated PDF is empty or corrupted.');
  }

  // Best-effort PDF magic-byte check (expo-print always writes PDF)
  try {
    const headerB64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
      length: 8,
      position: 0,
    });
    if (typeof globalThis.atob === 'function') {
      const header = globalThis.atob(headerB64).slice(0, 4);
      if (header !== '%PDF') {
        throw new Error('Generated file is not a valid PDF.');
      }
    }
  } catch (validateError) {
    if (validateError.message === 'Generated file is not a valid PDF.') {
      throw validateError;
    }
    // Older file-system APIs may not support position/length — size check above still applies
  }

  return { fileUri, fileName };
}

/**
 * Export attendance records to CSV format (Admin Dashboard / legacy).
 * @returns {Promise<{success: boolean, fileUri?: string, error?: string}>}
 */
export const exportAttendanceToCSV = async (companyId = null) => {
  try {
    const tenantCid = await resolveExportCompanyId(companyId);
    const records = await getAttendanceRecords(tenantCid);

    if (records.length === 0) {
      return {
        success: false,
        error: 'No attendance records found to export',
      };
    }

    let csvContent = 'Username,Date,Time,Type,Latitude,Longitude,Photo\n';

    records.forEach((record) => {
      const date = new Date(record.timestamp).toLocaleDateString();
      const time = new Date(record.timestamp).toLocaleTimeString();
      const lat = record.location ? record.location.latitude : '';
      const lng = record.location ? record.location.longitude : '';
      const photo = record.photo ? 'Yes' : 'No';

      csvContent += `${record.username},${date},${time},${record.type},${lat},${lng},${photo}\n`;
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `attendance_export_${timestamp}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, csvContent);

    return {
      success: true,
      fileUri: fileUri,
      fileName: fileName,
    };
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Share a local report file (PDF/CSV) via the system share sheet.
 * Prefer a file URL so native share targets receive a document, not plain text.
 */
export const shareReportFile = async (fileUri, fileName) => {
  try {
    let shareUri = fileUri;
    if (Platform.OS === 'android') {
      shareUri = await FileSystem.getContentUriAsync(fileUri);
    }

    await Share.share({
      url: shareUri,
      title: fileName || 'Report',
      mimeType: 'application/pdf',
      message:
        Platform.OS === 'android'
          ? fileName || 'Hadir report'
          : undefined,
    });
    return { success: true, fileUri, fileName };
  } catch (error) {
    if (error.message === 'The user did not share') {
      return { success: false, error: 'Share cancelled' };
    }
    console.error('Error sharing file:', error);
    return { success: false, error: error.message };
  }
};

/** Verify and retain a generated PDF for explicit download/retry actions. */
export const downloadReportFile = async (fileUri, fileName) => {
  try {
    if (!fileUri) throw new Error('Report file is not available.');
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists || (info.size != null && info.size < 100)) {
      throw new Error('Generated PDF is missing or corrupted.');
    }
    const headerB64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
      length: 8,
      position: 0,
    });
    if (typeof globalThis.atob === 'function' && globalThis.atob(headerB64).slice(0, 4) !== '%PDF') {
      throw new Error('Generated file is not a valid PDF.');
    }
    const downloadDir = `${FileSystem.documentDirectory}downloads/`;
    await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
    const downloadedUri = `${downloadDir}${fileName || 'report.pdf'}`;
    if (downloadedUri !== fileUri) {
      await FileSystem.copyAsync({ from: fileUri, to: downloadedUri });
    }
    return { success: true, fileUri: downloadedUri, fileName };
  } catch (error) {
    console.error('Error preparing report download:', error);
    return { success: false, error: error.message || 'Failed to download report' };
  }
};

/** @deprecated use shareReportFile — kept for AdminDashboard compatibility */
export const shareCSVFile = async (fileUri, fileName) =>
  shareReportFile(fileUri, fileName);

/**
 * Generate attendance report as a valid PDF for download or native sharing.
 */
export const generateAttendanceReport = async (companyId = null) => {
  try {
    const tenantCid = await resolveExportCompanyId(companyId);
    const records = await getAttendanceRecords(tenantCid);
    const nameByUsername = await fetchUsernameToNameMap(tenantCid);

    if (records.length === 0) {
      return {
        success: false,
        error: 'No attendance records found to export',
      };
    }

    const rows = records.map((record) => {
      const employeeName = nameByUsername.get(record.username) || record.username;
      const date = new Date(record.timestamp).toLocaleDateString();
      const time = new Date(record.timestamp).toLocaleTimeString();
      const location =
        record.location && record.location.address
          ? record.location.address
          : record.location
            ? `${record.location.latitude}, ${record.location.longitude}`
            : 'N/A';
      const authMethod = record.authMethod || 'N/A';
      return [employeeName, record.username, date, time, record.type, location, authMethod];
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `attendance_report_${timestamp}.pdf`;
    const html = buildReportHtml({
      title: 'Attendance Report',
      subtitle: `Generated ${new Date().toLocaleString()} · ${records.length} records`,
      sections: [
        {
          title: 'Attendance Records',
          headers: [
            'Employee Name',
            'Username',
            'Date',
            'Time',
            'Type',
            'Location',
            'Auth Method',
          ],
          rows,
        },
      ],
    });

    const { fileUri } = await writeHtmlPdf(html, fileName);
    return { success: true, fileUri, fileName };
  } catch (error) {
    console.error('Error generating attendance report:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate attendance report',
    };
  }
};

/**
 * Generate leave report as a valid PDF for download or native sharing.
 */
export const generateLeaveReport = async (companyId = null) => {
  try {
    const tenantCid = await resolveExportCompanyId(companyId);
    const leaveRequests = await getAllLeaveRequests(tenantCid);
    const leaveBalances = await getAllEmployeesLeaveBalances();
    const nameByUsername = await fetchUsernameToNameMap(tenantCid);

    if (leaveRequests.length === 0 && leaveBalances.length === 0) {
      return {
        success: false,
        error: 'No leave data found to export',
      };
    }

    const requestRows = leaveRequests.map((request) => {
      const employeeName =
        request.employeeName ||
        nameByUsername.get(request.employeeId) ||
        request.employeeId;
      const requestedDate = request.requestedAt
        ? new Date(request.requestedAt).toLocaleDateString()
        : 'N/A';
      const processedDate = request.processedAt
        ? new Date(request.processedAt).toLocaleDateString()
        : 'N/A';
      return [
        employeeName,
        request.employeeId,
        request.leaveType,
        request.startDate,
        request.endDate,
        request.days,
        request.status,
        requestedDate,
        processedDate,
        request.processedBy || 'N/A',
        request.reason || 'N/A',
      ];
    });

    const balanceRows = leaveBalances.map((balance) => {
      const employeeName =
        nameByUsername.get(balance.employeeId) || balance.employeeId;
      const annualRemaining =
        (balance.annualLeaves || 0) - (balance.usedAnnualLeaves || 0);
      const sickRemaining =
        (balance.sickLeaves || 0) - (balance.usedSickLeaves || 0);
      const casualRemaining =
        (balance.casualLeaves || 0) - (balance.usedCasualLeaves || 0);
      return [
        employeeName,
        balance.employeeId,
        balance.annualLeaves || 0,
        balance.usedAnnualLeaves || 0,
        annualRemaining,
        balance.sickLeaves || 0,
        balance.usedSickLeaves || 0,
        sickRemaining,
        balance.casualLeaves || 0,
        balance.usedCasualLeaves || 0,
        casualRemaining,
      ];
    });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `leave_report_${timestamp}.pdf`;
    const html = buildReportHtml({
      title: 'Leave Report',
      subtitle: `Generated ${new Date().toLocaleString()} · ${leaveRequests.length} requests · ${leaveBalances.length} balances`,
      sections: [
        {
          title: 'Leave Requests',
          headers: [
            'Employee Name',
            'Employee ID',
            'Leave Type',
            'Start Date',
            'End Date',
            'Days',
            'Status',
            'Requested Date',
            'Processed Date',
            'Processed By',
            'Reason',
          ],
          rows: requestRows,
        },
        {
          title: 'Leave Balances',
          headers: [
            'Employee Name',
            'Employee ID',
            'Annual (Total)',
            'Annual (Used)',
            'Annual (Remaining)',
            'Sick (Total)',
            'Sick (Used)',
            'Sick (Remaining)',
            'Casual (Total)',
            'Casual (Used)',
            'Casual (Remaining)',
          ],
          rows: balanceRows,
        },
      ],
    });

    const { fileUri } = await writeHtmlPdf(html, fileName);
    return { success: true, fileUri, fileName };
  } catch (error) {
    console.error('Error generating leave report:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate leave report',
    };
  }
};
