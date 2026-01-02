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
    const headers = {
      'Content-Type': 'application/json',
    };

    // Add authentication headers if user is available
    if (user) {
      if (user.email) {
        headers['x-user-email'] = user.email;
      }
      if (user.id) {
        headers['x-user-id'] = user.id;
      }
      if (user.uid) {
        headers['x-user-id'] = user.uid;
      }
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
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to generate report');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error generating report:', error);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout. Please try again.');
    }
    throw error;
  }
}

