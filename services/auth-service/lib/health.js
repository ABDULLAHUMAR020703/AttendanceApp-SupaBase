/**
 * Shared readiness helpers for Docker/Coolify healthchecks.
 * Keep probes fast and non-mutating.
 */
const { supabase, supabaseUrl, isServiceRole } = require('../config/supabase');

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        const err = new Error('timeout');
        err.name = 'AbortError';
        reject(err);
      }, timeoutMs);
    }),
  ]);
}

async function checkSupabase(timeoutMs = 2500) {
  if (!supabaseUrl || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, error: 'missing_supabase_env' };
  }

  try {
    const { error } = await withTimeout(
      supabase.from('companies').select('id', { head: true, count: 'exact' }).limit(1),
      timeoutMs
    );
    if (error) {
      return { ok: false, error: error.message, serviceRole: Boolean(isServiceRole) };
    }
    return { ok: true, serviceRole: Boolean(isServiceRole) };
  } catch (error) {
    return {
      ok: false,
      error: error.name === 'AbortError' ? 'timeout' : error.message,
      serviceRole: Boolean(isServiceRole),
    };
  }
}

module.exports = {
  checkSupabase,
};
