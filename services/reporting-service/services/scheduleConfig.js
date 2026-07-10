/**
 * Report schedule helpers — frequency, next run, cron eligibility
 */
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '../data/schedule-config.json');
const VALID_FREQUENCIES = ['daily', 'weekly', 'monthly'];
const SCHEDULE_HOUR_UTC = 2;

function ensureConfigFile() {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify({}, null, 2), 'utf8');
  }
}

function loadConfig() {
  ensureConfigFile();
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveConfig(config) {
  ensureConfigFile();
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

function normalizeFrequency(value) {
  return VALID_FREQUENCIES.includes(value) ? value : 'monthly';
}

function normalizeDay(day) {
  const n = Number(day);
  if (!Number.isFinite(n)) return 1;
  return Math.min(28, Math.max(1, Math.floor(n)));
}

/**
 * Compute the next scheduled run (02:00 UTC) from now.
 */
function computeNextExecution({ frequency = 'monthly', day = 1 } = {}) {
  const freq = normalizeFrequency(frequency);
  const targetDay = normalizeDay(day);
  const now = new Date();

  if (freq === 'daily') {
    const next = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      SCHEDULE_HOUR_UTC,
      0,
      0,
      0
    ));
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    return next.toISOString();
  }

  if (freq === 'weekly') {
    let next = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      SCHEDULE_HOUR_UTC,
      0,
      0,
      0
    ));
    while (next.getUTCDay() !== 1 || next <= now) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    return next.toISOString();
  }

  let candidate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    targetDay,
    SCHEDULE_HOUR_UTC,
    0,
    0,
    0
  ));
  if (candidate <= now) {
    candidate = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      targetDay,
      SCHEDULE_HOUR_UTC,
      0,
      0,
      0
    ));
  }
  return candidate.toISOString();
}

/**
 * Whether the scheduled job should run for this company today (02:00 UTC cron).
 */
function shouldRunScheduledReport(schedule, now = new Date()) {
  if (!schedule?.autoSend) return false;

  const frequency = normalizeFrequency(schedule.frequency);
  const utcDay = now.getUTCDate();
  const utcDow = now.getUTCDay();

  switch (frequency) {
    case 'daily':
      return true;
    case 'weekly':
      return utcDow === 1;
    case 'monthly':
    default:
      return utcDay === normalizeDay(schedule.day);
  }
}

function getExtendedSchedule(companyId, dbSchedule = {}) {
  const config = loadConfig();
  const entry = config[companyId] || {};
  const frequency = normalizeFrequency(dbSchedule.frequency || entry.frequency);
  const day = normalizeDay(dbSchedule.day ?? entry.day ?? 1);

  return {
    frequency,
    lastExecution: dbSchedule.lastExecution || entry.lastExecution || null,
    lastStatus: dbSchedule.lastStatus || entry.lastStatus || null,
    nextExecution: computeNextExecution({ frequency, day }),
  };
}

function setExtendedSchedule(companyId, { frequency }) {
  const config = loadConfig();
  if (!config[companyId]) config[companyId] = {};
  if (frequency !== undefined) {
    if (!VALID_FREQUENCIES.includes(frequency)) {
      throw new Error('frequency must be daily, weekly, or monthly');
    }
    config[companyId].frequency = frequency;
  }
  saveConfig(config);
  return getExtendedSchedule(companyId, { frequency });
}

function recordScheduleExecution(companyId, status) {
  const config = loadConfig();
  if (!config[companyId]) config[companyId] = {};
  config[companyId].lastExecution = new Date().toISOString();
  config[companyId].lastStatus = status;
  saveConfig(config);
}

module.exports = {
  getExtendedSchedule,
  setExtendedSchedule,
  recordScheduleExecution,
  computeNextExecution,
  shouldRunScheduledReport,
  normalizeFrequency,
  normalizeDay,
  VALID_FREQUENCIES,
};
