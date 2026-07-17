/**
 * Shared readiness helpers for Docker/Coolify healthchecks.
 * Keep probes fast and non-mutating.
 */
const fs = require('fs');
const path = require('path');
const { supabase, supabaseUrl } = require('../config/supabase');

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
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error.name === 'AbortError' ? 'timeout' : error.message,
    };
  }
}

function checkDataDirWritable(dataDir = path.join(__dirname, '../data')) {
  try {
    fs.mkdirSync(path.join(dataDir, 'reports'), { recursive: true });
    const probe = path.join(dataDir, '.healthwrite');
    fs.writeFileSync(probe, String(Date.now()), 'utf8');
    fs.unlinkSync(probe);
    return { ok: true, path: dataDir };
  } catch (error) {
    return { ok: false, error: error.message, path: dataDir };
  }
}

function checkSmtpConfig() {
  const configured = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  return {
    // SMTP outage must not mark the container unhealthy; email is soft-required.
    ok: true,
    configured,
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
  };
}

module.exports = {
  checkSupabase,
  checkDataDirWritable,
  checkSmtpConfig,
};
