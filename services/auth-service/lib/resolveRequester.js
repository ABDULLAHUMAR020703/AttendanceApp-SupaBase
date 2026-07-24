/**
 * Resolve caller identity from X-User-Context and/or Authorization Bearer (Supabase JWT).
 * Prefer explicit X-User-Context when present; fall back to JWT so Traefik/proxies that
 * drop custom headers still authenticate standard Authorization.
 */
const { supabase } = require('../config/supabase');

function parseUserContextHeader(req) {
  const raw = req.get('x-user-context') || req.get('X-User-Context');
  if (!raw || !String(raw).trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.uid) return null;
    return parsed;
  } catch {
    return null;
  }
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization || req.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
}

/**
 * @param {import('express').Request} req
 * @returns {Promise<{ uid: string, role?: string, company_id?: string, companyId?: string, department?: string, username?: string }|null>}
 */
async function resolveRequester(req) {
  const fromHeader = parseUserContextHeader(req);
  if (fromHeader?.uid) {
    return fromHeader;
  }

  const token = extractBearerToken(req);
  if (!token) return null;

  const { data: userResult, error } = await supabase.auth.getUser(token);
  if (error || !userResult?.user?.id) {
    console.warn('[resolveRequester] JWT invalid:', error?.message || 'no user');
    return null;
  }

  const uid = String(userResult.user.id);
  const { data: row } = await supabase
    .from('users')
    .select('uid, username, role, company_id, department')
    .eq('uid', uid)
    .eq('is_active', true)
    .maybeSingle();

  if (row?.uid) {
    return {
      uid: row.uid,
      role: row.role,
      company_id: row.company_id,
      companyId: row.company_id,
      department: row.department != null ? String(row.department) : '',
      username: row.username,
    };
  }

  const meta = userResult.user.user_metadata || {};
  return {
    uid,
    role: meta.role,
    company_id: meta.company_id,
    companyId: meta.company_id,
    department: meta.department != null ? String(meta.department) : '',
    username: meta.username,
  };
}

module.exports = {
  parseUserContextHeader,
  extractBearerToken,
  resolveRequester,
};
