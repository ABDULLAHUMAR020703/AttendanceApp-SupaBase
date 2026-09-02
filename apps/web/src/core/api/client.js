import axios from 'axios';
import { apiUrl, IS_API_GATEWAY_CONFIGURED, IS_API_GATEWAY_LOCAL } from '../config/api';
import { useAuthStore } from '../../features/auth/store/authStore';
import { supabase } from '../config/supabase';

export const api = axios.create({
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  if (!IS_API_GATEWAY_CONFIGURED) {
    console.error('[api] API base URL is missing. Set VITE_API_GATEWAY_URL or NEXT_PUBLIC_API_URL on Vercel.');
    throw new Error('Service configuration is missing. Please try again later.');
  }

  if (IS_API_GATEWAY_LOCAL && !import.meta.env.DEV) {
    console.error('[api] Local API URL detected in non-development environment.');
    throw new Error('Service endpoint is not publicly reachable. Please contact support.');
  }

  if (config.url && !/^https?:\/\//i.test(String(config.url))) {
    const full = apiUrl(config.url);
    if (import.meta.env.DEV) {
      console.log('[api] request:', (config.method || 'get').toUpperCase(), full);
    }
    config.url = full;
  }

  // Authoritative identity: the gateway verifies this Supabase JWT and derives
  // role / company_id / department server-side. The gateway ignores any
  // x-user-context we send (kept only for legacy gateways without JWT verify).
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    /* proceed without a token — protected routes will 401 */
  }

  const user = useAuthStore.getState().user;
  if (user) {
    config.headers['x-user-context'] = JSON.stringify(user);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const endpoint = error?.config?.url || 'unknown-endpoint';
    const payload = error?.response?.data;
    console.error('[api] Request failed:', { endpoint, status, payload, message: error?.message });
    return Promise.reject(error);
  }
);
