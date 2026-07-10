import { API_GATEWAY_URL } from '../config/api';
import { buildGatewayAuthHeaders, resolveCurrentRequester } from './gatewayRequest';

function gatewayBase() {
  return typeof API_GATEWAY_URL === 'string'
    ? API_GATEWAY_URL.replace(/\/+$/, '')
    : String(API_GATEWAY_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

export async function refreshPermissionsFromServer(requester = null) {
  const ctx = requester || (await resolveCurrentRequester());
  if (!ctx?.uid) return { success: false, permissions: [] };
  try {
    const response = await fetch(`${gatewayBase()}/api/auth/me/permissions`, {
      method: 'GET',
      headers: buildGatewayAuthHeaders(ctx),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.success) {
      return { success: false, permissions: ctx.permissions || [] };
    }
    return { success: true, permissions: body.data?.permissions || [], role: body.data?.role };
  } catch {
    return { success: false, permissions: ctx.permissions || [] };
  }
}

export async function submitWorkModeRequest(requester, { requested_work_mode, reason }) {
  const ctx = requester || (await resolveCurrentRequester());
  if (!ctx) return { success: false, error: 'Sign in required' };
  try {
    const response = await fetch(`${gatewayBase()}/api/auth/work-mode-requests`, {
      method: 'POST',
      headers: buildGatewayAuthHeaders(ctx),
      body: JSON.stringify({ requested_work_mode, reason }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.success) {
      return { success: false, error: body.error || 'Failed to submit request' };
    }
    return { success: true, data: body.data };
  } catch (e) {
    return { success: false, error: e?.message || 'Network error' };
  }
}

export async function fetchMyWorkModeRequests(requester = null) {
  const ctx = requester || (await resolveCurrentRequester());
  if (!ctx) return { success: false, data: [] };
  try {
    const response = await fetch(`${gatewayBase()}/api/auth/work-mode-requests/mine`, {
      method: 'GET',
      headers: buildGatewayAuthHeaders(ctx),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.success) {
      return { success: false, data: [] };
    }
    return { success: true, data: body.data || [] };
  } catch {
    return { success: false, data: [] };
  }
}

export async function processWorkModeRequestApi(requester, id, { status, admin_notes }) {
  const ctx = requester || (await resolveCurrentRequester());
  if (!ctx) return { success: false, error: 'Sign in required' };
  try {
    const response = await fetch(`${gatewayBase()}/api/admin/work-mode-requests/${id}`, {
      method: 'PATCH',
      headers: buildGatewayAuthHeaders(ctx),
      body: JSON.stringify({ status, admin_notes }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.success) {
      return { success: false, error: body.error || 'Failed to process request' };
    }
    return { success: true, data: body.data };
  } catch (e) {
    return { success: false, error: e?.message || 'Network error' };
  }
}

export async function fetchWorkModeRequestsAdmin(requester = null) {
  const ctx = requester || (await resolveCurrentRequester());
  if (!ctx) return { success: false, data: [] };
  try {
    const response = await fetch(`${gatewayBase()}/api/admin/work-mode-requests`, {
      method: 'GET',
      headers: buildGatewayAuthHeaders(ctx),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.success) {
      return { success: false, data: [] };
    }
    return { success: true, data: body.data || [] };
  } catch {
    return { success: false, data: [] };
  }
}
