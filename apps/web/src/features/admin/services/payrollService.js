import { api } from '../../../core/api/client';
import { apiUrl } from '../../../core/config/api';

const extractApiMessage = (error, fallbackMessage) => {
  const apiError = error?.response?.data?.error;
  if (typeof apiError === 'string' && apiError.trim()) return apiError;
  const status = error?.response?.status;
  if (status === 401) return 'Authentication expired or missing. Sign out and sign in again.';
  if (status === 403) return 'Payroll access is restricted to super admins.';
  if (status === 404) return fallbackMessage || 'Payroll API endpoint not found. Redeploy auth-service and gateway.';
  if (status === 422) return apiError || fallbackMessage || 'Payroll could not be calculated.';
  return fallbackMessage || error?.message || 'Request failed. Check the browser console for details.';
};

const call = async (fn, fallbackMessage) => {
  try {
    return await fn();
  } catch (error) {
    // 422 carries structured data (missing salary profiles) callers need.
    if (error?.response?.status === 422) {
      const wrapped = new Error(extractApiMessage(error, fallbackMessage));
      wrapped.data = error.response.data?.data;
      throw wrapped;
    }
    throw new Error(extractApiMessage(error, fallbackMessage));
  }
};

export const payrollService = {
  getDashboard: () =>
    call(async () => (await api.get(apiUrl('/api/admin/payroll/dashboard'))).data.data, 'Failed to load payroll dashboard'),

  getSalaryProfiles: (employeeUid) =>
    call(async () => {
      const q = employeeUid ? `?employee_uid=${encodeURIComponent(employeeUid)}` : '';
      return (await api.get(apiUrl(`/api/admin/payroll/salary-profiles${q}`))).data.data;
    }, 'Failed to load salary profiles'),
  createSalaryProfile: (payload) =>
    call(async () => (await api.post(apiUrl('/api/admin/payroll/salary-profiles'), payload)).data.data, 'Failed to create salary profile'),
  updateSalaryProfile: (id, payload) =>
    call(async () => (await api.patch(apiUrl(`/api/admin/payroll/salary-profiles/${id}`), payload)).data.data, 'Failed to update salary profile'),

  getPeriods: () =>
    call(async () => (await api.get(apiUrl('/api/admin/payroll/periods'))).data.data, 'Failed to load payroll periods'),
  getPeriod: (id) =>
    call(async () => (await api.get(apiUrl(`/api/admin/payroll/periods/${id}`))).data.data, 'Failed to load payroll period'),
  createPeriod: (payload) =>
    call(async () => (await api.post(apiUrl('/api/admin/payroll/periods'), payload)).data.data, 'Failed to create payroll period'),
  calculatePeriod: (id) =>
    call(async () => (await api.post(apiUrl(`/api/admin/payroll/periods/${id}/calculate`), {})).data.data, 'Failed to calculate payroll'),
  recalculatePeriod: (id) =>
    call(async () => (await api.post(apiUrl(`/api/admin/payroll/periods/${id}/recalculate`), {})).data.data, 'Failed to recalculate payroll'),
  reviewPeriod: (id) =>
    call(async () => (await api.post(apiUrl(`/api/admin/payroll/periods/${id}/review`), {})).data.data, 'Failed to mark payroll reviewed'),
  approvePeriod: (id) =>
    call(async () => (await api.post(apiUrl(`/api/admin/payroll/periods/${id}/approve`), {})).data.data, 'Failed to approve payroll'),
  lockPeriod: (id) =>
    call(async () => (await api.post(apiUrl(`/api/admin/payroll/periods/${id}/lock`), {})).data.data, 'Failed to lock payroll'),

  getPeriodRecords: (id, filters = {}) =>
    call(async () => {
      const params = new URLSearchParams();
      if (filters.department_id) params.set('department_id', filters.department_id);
      if (filters.status) params.set('status', filters.status);
      if (filters.search) params.set('search', filters.search);
      const qs = params.toString();
      return (await api.get(apiUrl(`/api/admin/payroll/periods/${id}/records${qs ? `?${qs}` : ''}`))).data.data;
    }, 'Failed to load payroll records'),
  getRecord: (id) =>
    call(async () => (await api.get(apiUrl(`/api/admin/payroll/records/${id}`))).data.data, 'Failed to load payroll record'),

  addAdjustment: (recordId, payload) =>
    call(async () => (await api.post(apiUrl(`/api/admin/payroll/records/${recordId}/adjustments`), payload)).data.data, 'Failed to add adjustment'),
  deleteAdjustment: (kind, id) =>
    call(async () => (await api.delete(apiUrl(`/api/admin/payroll/adjustments/${kind}/${id}`))).data, 'Failed to remove adjustment'),

  getSummaryReport: (periodId) =>
    call(async () => (await api.get(apiUrl(`/api/admin/payroll/reports/summary/${periodId}`))).data.data, 'Failed to load payroll report'),
};
