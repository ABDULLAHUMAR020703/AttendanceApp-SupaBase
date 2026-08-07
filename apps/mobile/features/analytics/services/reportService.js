/**
 * Report Service - Frontend service for generating reports
 */
import { API_GATEWAY_URL, API_TIMEOUT } from '../../../core/config/api';
import * as FileSystem from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { Linking, Platform, Share } from 'react-native';

/** Match web admin report timeouts (PDF build + email can exceed default API_TIMEOUT). */
const REPORT_TIMEOUT_MS = 120000;

function buildAuthHeaders(user) {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (!user) return headers;

  // Prefer uid (Supabase Auth ID) — matches users.uid used by reporting-service
  if (user.uid) {
    headers['x-user-id'] = String(user.uid);
  } else if (user.id) {
    headers['x-user-id'] = String(user.id);
  }

  if (user.email) {
    headers['x-user-email'] = user.email;
  }

  return headers;
}

function uint8ArrayToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  if (typeof globalThis.btoa !== 'function') {
    throw new Error('Unable to encode PDF for storage on this device.');
  }
  return globalThis.btoa(binary);
}

/**
 * Generate a report PDF and email it to configured recipients.
 * Uses POST /api/reports/generate-and-email (same as web admin).
 *
 * @param {string} range - 'weekly' | 'monthly' | 'yearly' | 'all' | 'custom'
 * @param {string|null} from - Start date (YYYY-MM-DD) for custom
 * @param {string|null} to - End date (YYYY-MM-DD) for custom
 * @param {Object} user - Auth user (uid/email/role)
 * @returns {Promise<Object>} API response including reportId and emailStatus
 */
export async function generateReport(range, from = null, to = null, user = null) {
  try {
    if (!API_GATEWAY_URL || API_GATEWAY_URL.includes('localhost') || API_GATEWAY_URL.includes('undefined')) {
      throw new Error('API Gateway is not configured. Please check your app configuration.');
    }

    const headers = buildAuthHeaders(user);

    if (__DEV__) {
      console.log('[ReportService] Sending user headers:', {
        'x-user-id': headers['x-user-id'],
        'x-user-email': headers['x-user-email'],
        userRole: user?.role,
      });
      if (!user) {
        console.warn('[ReportService] No user object provided - report generation may fail');
      }
    }

    // Web admin uses /generate-and-email. /generate is PDF-only (sendEmail: false).
    const url = `${API_GATEWAY_URL}/api/reports/generate-and-email`;
    if (__DEV__) {
      console.log('[ReportService] Requesting report generation:', {
        url,
        range,
        from,
        to,
        hasUser: !!user,
        timeoutMs: REPORT_TIMEOUT_MS,
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REPORT_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          range,
          from,
          to,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      let errorMessage = 'Failed to generate report';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;

        if (response.status === 401 || response.status === 403) {
          errorMessage = 'Permission denied. Only super admins can generate reports.';
        } else if (response.status === 503) {
          errorMessage = 'Reporting service is unavailable. Please try again later.';
        } else if (response.status === 400) {
          errorMessage = errorData.message || 'Invalid request. Please check your date range.';
        }
      } catch (parseError) {
        errorMessage = response.statusText || `Server error (${response.status})`;
        if (__DEV__) {
          console.warn('[ReportService] Could not parse error response:', parseError);
        }
      }

      if (__DEV__) {
        console.error('[ReportService] API error:', {
          status: response.status,
          statusText: response.statusText,
          message: errorMessage,
        });
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();

    if (__DEV__) {
      console.log('[ReportService] Report generation completed:', {
        reportId: data.reportId,
        emailStatus: data.emailStatus,
        message: data.message,
      });
    }

    if (!data.success && data.success !== undefined) {
      throw new Error(data.message || data.error || 'Failed to generate report');
    }

    return data;
  } catch (error) {
    console.error('[ReportService] Error generating report:', error);

    if (error.name === 'AbortError') {
      throw new Error(
        'Request timeout. Report generation can take up to a couple of minutes. Please try again.'
      );
    }

    if (
      error.message?.includes('Network request failed') ||
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('NetworkError') ||
      error.message?.includes('TypeError')
    ) {
      throw new Error('Network error. Please check your internet connection and try again.');
    }

    if (error.message && error.message !== 'Failed to generate report') {
      throw error;
    }

    throw new Error(
      error.message || 'Failed to generate report. Please check your connection and try again.'
    );
  }
}

/**
 * Download a generated report PDF and verify it is a valid PDF.
 * @param {string} reportId
 * @param {Object} user
 * @returns {Promise<{success: boolean, fileUri?: string}>}
 */
export async function downloadReport(reportId, user = null) {
  try {
    if (!API_GATEWAY_URL || API_GATEWAY_URL.includes('localhost') || API_GATEWAY_URL.includes('undefined')) {
      throw new Error('API Gateway is not configured. Please check your app configuration.');
    }

    if (!reportId) {
      throw new Error('No report ID available. Please generate a report first.');
    }

    const headers = buildAuthHeaders(user);
    // GET download does not need JSON content-type
    delete headers['Content-Type'];

    const url = `${API_GATEWAY_URL}/api/reports/download/${reportId}`;

    if (__DEV__) {
      console.log('[ReportService] Downloading report:', { url, reportId });
    }

    const documentDir = FileSystemLegacy.documentDirectory || FileSystem.documentDirectory;
    if (!documentDir) {
      throw new Error(
        'Document directory is not available. Please ensure expo-file-system is properly configured.'
      );
    }
    const fileUri = `${documentDir}report-${reportId}.pdf`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REPORT_TIMEOUT_MS);

    let response;
    try {
      response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const contentType = response.headers.get('content-type') || '';

    if (!response.ok) {
      let errorMessage = `Download failed with status ${response.status}`;
      if (contentType.includes('application/json')) {
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (_) {
          /* keep status message */
        }
      }
      if (response.status === 404) {
        errorMessage =
          'Report not found or has expired. Reports are retained for 7 days.';
      } else if (response.status === 401 || response.status === 403) {
        errorMessage = 'Permission denied. Unable to download this report.';
      }
      throw new Error(errorMessage);
    }

    if (contentType.includes('application/json')) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'Unable to download report');
    }

    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    if (bytes.length < 100) {
      throw new Error('Downloaded file is empty or corrupted.');
    }

    const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    if (magic !== '%PDF') {
      throw new Error('Downloaded file is not a valid PDF.');
    }

    const base64 = uint8ArrayToBase64(bytes);
    await FileSystemLegacy.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystemLegacy.EncodingType.Base64,
    });

    if (__DEV__) {
      console.log('[ReportService] Report downloaded successfully:', {
        fileUri,
        bytes: bytes.length,
      });
    }

    return {
      success: true,
      fileUri,
    };
  } catch (error) {
    console.error('[ReportService] Error downloading report:', error);

    if (error.name === 'AbortError') {
      throw new Error('Download timed out. Please try again.');
    }

    if (error.message?.includes('404') || error.message?.includes('not found')) {
      throw new Error('Report not found or has expired. Reports are retained for 7 days.');
    }

    if (error.message?.includes('Network') || error.message?.includes('fetch')) {
      throw new Error('Network error. Please check your internet connection and try again.');
    }

    throw new Error(error.message || 'Failed to download report. Please try again.');
  }
}

/**
 * Open / share a downloaded report PDF using the system share sheet.
 * @param {string} fileUri
 */
export async function openReport(fileUri) {
  try {
    let shareUri = fileUri;
    if (Platform.OS === 'android') {
      shareUri = await FileSystemLegacy.getContentUriAsync(fileUri);
    }

    try {
      await Share.share({
        url: shareUri,
        title: 'Attendance Report',
        message: Platform.OS === 'android' ? 'Attendance Report PDF' : undefined,
      });
      return { success: true };
    } catch (shareError) {
      // Fallback: try opening via Linking
      if (__DEV__) {
        console.warn('[ReportService] Share failed, trying Linking:', shareError?.message);
      }
      const canOpen = await Linking.canOpenURL(shareUri);
      if (canOpen) {
        await Linking.openURL(shareUri);
        return { success: true };
      }
      throw shareError;
    }
  } catch (error) {
    console.error('[ReportService] Error opening report:', error);
    throw new Error(
      error.message || 'Failed to open report. The file has been saved to your device.'
    );
  }
}

export { REPORT_TIMEOUT_MS, API_TIMEOUT };
