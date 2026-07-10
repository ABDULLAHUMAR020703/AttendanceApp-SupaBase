import { useCallback, useEffect, useState } from 'react';
import { GlassCard } from '../../../shared/components/GlassCard';
import { PermissionGate } from '../../../shared/components/PermissionGate';
import { adminService } from '../services/adminService';
import { PERMISSIONS } from '../permissions';

const SECTIONS = [
  { id: 'company', label: 'Company' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'leave', label: 'Leave' },
  { id: 'tickets', label: 'Tickets' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'reports', label: 'Reports' },
  { id: 'geofencing', label: 'Geofencing' },
  { id: 'security', label: 'Security' },
  { id: 'theme', label: 'Theme' },
];

function SectionFields({ section, values, onChange }) {
  if (!values) return null;
  const field = (key, label, type = 'text') => (
    <label key={key} className="flex flex-col gap-1 text-sm">
      <span className="text-slate-400 text-xs">{label}</span>
      {type === 'checkbox' ? (
        <input type="checkbox" checked={!!values[key]} onChange={(e) => onChange(key, e.target.checked)} className="h-4 w-4" />
      ) : (
        <input type={type} value={values[key] ?? ''} onChange={(e) => onChange(key, type === 'number' ? Number(e.target.value) : e.target.value)} className="rounded border border-white/20 bg-white/10 px-3 py-2 text-slate-100" />
      )}
    </label>
  );

  switch (section) {
    case 'company':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {field('name', 'Company name')}
          {field('logoUrl', 'Logo URL')}
          {field('timezone', 'Timezone')}
        </div>
      );
    case 'attendance':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {field('graceMinutes', 'Grace minutes (late)', 'number')}
          {field('autoCheckoutEnabled', 'Auto checkout', 'checkbox')}
          {field('requireGps', 'Require GPS', 'checkbox')}
        </div>
      );
    case 'leave':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {field('defaultAnnual', 'Default annual days', 'number')}
          {field('defaultSick', 'Default sick days', 'number')}
          {field('defaultCasual', 'Default casual days', 'number')}
          {field('yearStart', 'Year start (MM-DD)')}
          {field('yearEnd', 'Year end (MM-DD)')}
        </div>
      );
    case 'tickets':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {field('defaultPriority', 'Default priority')}
          {field('notifyOnAssign', 'Notify on assign', 'checkbox')}
        </div>
      );
    case 'calendar':
      return <div className="grid gap-3">{field('defaultVisibility', 'Default visibility (all/none/selected)')}</div>;
    case 'notifications':
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          {field('emailEnabled', 'Email', 'checkbox')}
          {field('pushEnabled', 'Push', 'checkbox')}
          {field('inAppEnabled', 'In-app', 'checkbox')}
        </div>
      );
    case 'reports':
      return <div className="grid gap-3">{field('retentionDays', 'Retention days', 'number')}</div>;
    case 'geofencing':
      return <div className="grid gap-3">{field('defaultRadiusMeters', 'Default radius (m)', 'number')}</div>;
    case 'security':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {field('sessionTimeoutMinutes', 'Session timeout (min)', 'number')}
          {field('requireStrongPasswords', 'Strong passwords', 'checkbox')}
        </div>
      );
    case 'theme':
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          {field('accent', 'Accent color')}
          {field('density', 'Density (comfortable/compact)')}
        </div>
      );
    default:
      return null;
  }
}

export function SettingsPage() {
  const [active, setActive] = useState('company');
  const [settings, setSettings] = useState(null);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getSettings();
      setSettings(data);
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (settings) setDraft({ ...(settings[active] || {}) });
  }, [active, settings]);

  function onFieldChange(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await adminService.saveSettingsSection(active, draft);
      setSettings(res.data);
      setMessage({ ok: true, text: res.message || 'Saved' });
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function resetSection() {
    if (!window.confirm(`Reset ${active} settings to defaults?`)) return;
    setSaving(true);
    try {
      const res = await adminService.saveSettingsSection(active, null, true);
      setSettings(res.data);
      setDraft(res.data?.[active] || {});
      setMessage({ ok: true, text: 'Reset to defaults' });
    } catch (err) {
      setMessage({ ok: false, text: err.message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <PermissionGate permission={PERMISSIONS.ACCESS_SYSTEM_SETTINGS}>
      <div className="space-y-5 animate-fade-up">
        <h1 className="text-2xl font-semibold text-white">Settings</h1>

        {message && (
          <div className={`rounded-lg border px-4 py-3 text-sm ${message.ok ? 'border-green-300/25 bg-green-500/15 text-green-100' : 'border-red-300/25 bg-red-500/15 text-red-100'}`}>
            {message.text}
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-4">
          <GlassCard className="p-3 space-y-1">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setActive(s.id)}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm ${active === s.id ? 'bg-blue-500/20 text-blue-100' : 'text-slate-300 hover:bg-white/10'}`}
              >
                {s.label}
              </button>
            ))}
          </GlassCard>

          <GlassCard className="p-5 lg:col-span-3 space-y-4">
            <h2 className="text-base font-medium text-white capitalize">{active} settings</h2>
            {loading ? (
              <div className="h-32 skeleton rounded-lg" />
            ) : (
              <>
                <SectionFields section={active} values={draft} onChange={onFieldChange} />
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white disabled:opacity-50">Save</button>
                  <button type="button" onClick={resetSection} disabled={saving} className="rounded-lg border border-white/20 px-4 py-2 text-sm text-slate-200">Reset</button>
                </div>
              </>
            )}
          </GlassCard>
        </div>
      </div>
    </PermissionGate>
  );
}
