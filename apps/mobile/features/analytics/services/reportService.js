/**
 * Report Service - Frontend service for generating reports
 */
import { API_GATEWAY_URL, API_TIMEOUT } from '../../../core/config/api';

/**
 * Generate a report
 * @param {string} range - Report range: 'weekly', 'monthly', 'yearly', 'all', or 'custom'
 * @param {string} from - Start date (ISO format) - optional, required for custom
 * @param {string} to - End date (ISO format) - optional, required for custom
 * @param {Object} user - User object with email and id
 * @returns {Promise<Object>} API response
 */
export async function generateReport(range, from = null, to = null, user = null) {
  try {
    // Validate API Gateway URL
    if (!API_GATEWAY_URL || API_GATEWAY_URL.includes('localhost') || API_GATEWAY_URL.includes('undefined')) {
      throw new Error('API Gateway is not configured. Please check your app configuration.');
    }

    const headers = {
      'Content-Type': 'application/json',
    };

    // Add authentication headers if user is available
    // Backend expects x-user-id or x-user-email to verify super_admin role
    if (user) {
      // Prefer uid (Supabase Auth ID) as it matches the database uid column
      if (user.uid) {
        headers['x-user-id'] = String(user.uid);
      } else if (user.id) {
        headers['x-user-id'] = String(user.id);
      }
      
      // Also send email as fallback
      if (user.email) {
        headers['x-user-email'] = user.email;
      }
      
      if (__DEV__) {
        console.log('[ReportService] Sending user headers:', {
          'x-user-id': headers['x-user-id'],
          'x-user-email': headers['x-user-email'],
          userRole: user.role,
        });
      }
    } else {
      if (__DEV__) {
        console.warn('[ReportService] No user object provided - report generation may fail');
      }
    }

    const url = `${API_GATEWAY_URL}/api/reports/generate`;
    if (__DEV__) {
      console.log('[ReportService] Requesting report generation:', {
        url,
        range,
        from,
        to,
        hasUser: !!user,
      });
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(`${API_GATEWAY_URL}/api/reports/generate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        range,
        from,
        to,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // Try to parse error response
      let errorMessage = 'Failed to generate report';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || errorMessage;
        
        // Provide more specific error messages
        if (response.status === 401 || response.status === 403) {
          errorMessage = 'Permission denied. Only super admins can generate reports.';
        } else if (response.status === 503) {
          errorMessage = 'Reporting service is unavailable. Please try again later.';
        } else if (response.status === 400) {
          errorMessage = errorData.message || 'Invalid request. Please check your date range.';
        }
      } catch (parseError) {
        // If response is not JSON, use status text
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
      console.log('[ReportService] Report generation started successfully:', data);
    }
    
    return data;
  } catch (error) {
    console.error('[ReportService] Error generating report:', error);
    
    // Handle specific error types
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. The server took too long to respond. Please try again.');
    }
    
    // Handle network errors (fetch fails before response)
    if (error.message?.includes('Network request failed') || 
        error.message?.includes('Failed to fetch') ||
        error.message?.includes('NetworkError') ||
        error.message?.includes('TypeError')) {
      throw new Error('Network error. Please check your internet connection and try again.');
    }
    
    // If error already has a message (from our error handling above), use it
    if (error.message && error.message !== 'Failed to generate report') {
      throw error;
    }
    
    // Generic fallback
    throw new Error(error.message || 'Failed to generate report. Please check your connection and try again.');
  }
}

