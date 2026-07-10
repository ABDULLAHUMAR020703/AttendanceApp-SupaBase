import { useCallback, useEffect, useState } from 'react';
import { adminService } from '../services/adminService';
import { GlassCard } from '../../../shared/components/GlassCard';
import { PermissionGate } from '../../../shared/components/PermissionGate';
import { PERMISSIONS } from '../permissions';
import { useSilentPoll } from '../../../shared/hooks/useSilentPoll';

export function SitesPage() {
  const [sites, setSites] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignEmployeeUid, setAssignEmployeeUid] = useState('');
  const [assignSiteIds, setAssignSiteIds] = useState([]);
  const [assignSaving, setAssignSaving] = useState(false);
  const [form, setForm] = useState({ name: '', latitude: '', longitude: '', radius: '', department_id: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [sitesData, departmentsData, usersData] = await Promise.all([
        adminService.getSites(),
        adminService.getDepartments(),
        adminService.getUsers().catch(() => []),
      ]);
      setSites(sitesData || []);
      setDepartments(departmentsData || []);
      setUsers((usersData || []).filter((u) => u.role === 'employee' || u.role === 'manager'));
    } catch (err) {
      if (!silent) setError(err?.response?.data?.error || err?.message || 'Failed to load sites');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useSilentPoll(load, 30000);

  const createSite = async () => {
    setError('');
    try {
      await adminService.createSite({
        ...form,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        radius: Number(form.radius),
      });
      setForm({ name: '', latitude: '', longitude: '', radius: '', department_id: '' });
      await load();
    } catch (err) {
      console.error('[SitesPage] Failed to create site:', err);
      setError(err?.message || 'Failed to create site');
    }
  };

  const loadEmployeeAssignments = async (uid) => {
    if (!uid) {
      setAssignSiteIds([]);
      return;
    }
    const rows = await adminService.getEmployeeSites(uid);
    setAssignSiteIds((rows || []).map((r) => r.site_id));
  };

  const saveAssignments = async () => {
    if (!assignEmployeeUid) return;
    setAssignSaving(true);
    setError('');
    try {
      await adminService.setEmployeeSites(assignEmployeeUid, assignSiteIds);
    } catch (err) {
      setError(err.message || 'Failed to save assignments');
    } finally {
      setAssignSaving(false);
    }
  };

  const toggleSite = (siteId) => {
    setAssignSiteIds((prev) =>
      prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]
    );
  };

  return (
    <div className="space-y-5 animate-fade-up">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-white">Sites</h1>
        <button
          type="button"
          onClick={load}
          className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs text-slate-100 hover:bg-white/20 transition-all duration-200"
        >
          Refresh
        </button>
      </div>
      {error && <GlassCard className="p-4 text-sm text-red-100">{error}</GlassCard>}

      <PermissionGate permission={PERMISSIONS.MANAGE_GEOFENCING}>
        <div className="grid md:grid-cols-5 gap-2 mb-4">
          <input className="rounded bg-slate-800/80 p-2 text-slate-100" placeholder="name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <input className="rounded bg-slate-800/80 p-2 text-slate-100" placeholder="latitude" value={form.latitude} onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))} />
          <input className="rounded bg-slate-800/80 p-2 text-slate-100" placeholder="longitude" value={form.longitude} onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))} />
          <input className="rounded bg-slate-800/80 p-2 text-slate-100" placeholder="radius" value={form.radius} onChange={(e) => setForm((p) => ({ ...p, radius: e.target.value }))} />
          <select
            className="glass-select rounded bg-slate-800/80 p-2 text-slate-100"
            value={form.department_id}
            onChange={(e) => setForm((p) => ({ ...p, department_id: e.target.value }))}
          >
            <option value="" className="bg-slate-100 text-slate-900">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id} className="bg-slate-100 text-slate-900">
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <button className="rounded bg-indigo-600 px-3 py-2 mb-4 text-white" onClick={createSite}>
          Create Site
        </button>
      </PermissionGate>

      <div className="space-y-2">
        {loading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl border border-white/15 bg-white/10 skeleton" />
          ))}
        {!loading && sites.length === 0 && <GlassCard className="p-4 text-sm text-slate-300">No sites available.</GlassCard>}
        {!loading &&
          sites.map((s) => (
            <GlassCard key={s.id} className="p-3 text-slate-100">
              {s.name} ({s.latitude}, {s.longitude}) r={s.radius}
            </GlassCard>
          ))}
      </div>

      <PermissionGate permission={PERMISSIONS.MANAGE_GEOFENCING}>
        <GlassCard className="p-5 space-y-4">
          <div>
            <h2 className="text-base font-medium text-white">Employee location assignments</h2>
            <p className="text-xs text-slate-300 mt-1">Assign multiple geofence sites per employee (synced to mobile check-in).</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100"
              value={assignEmployeeUid}
              onChange={(e) => {
                setAssignEmployeeUid(e.target.value);
                loadEmployeeAssignments(e.target.value);
              }}
            >
              <option value="" className="bg-slate-800">Select employee</option>
              {users.map((u) => (
                <option key={u.uid} value={u.uid} className="bg-slate-800">{u.name || u.username} ({u.department})</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!assignEmployeeUid || assignSaving}
              onClick={saveAssignments}
              className="rounded-lg border border-blue-300/30 bg-blue-500/20 px-4 py-2 text-sm text-blue-100 disabled:opacity-50"
            >
              {assignSaving ? 'Saving…' : 'Save assignments'}
            </button>
          </div>
          {assignEmployeeUid && (
            <div className="flex flex-wrap gap-2">
              {sites.map((s) => (
                <label key={s.id} className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs cursor-pointer ${assignSiteIds.includes(s.id) ? 'border-blue-300/40 bg-blue-500/20 text-blue-100' : 'border-white/15 text-slate-300'}`}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={assignSiteIds.includes(s.id)}
                    onChange={() => toggleSite(s.id)}
                  />
                  {s.name}
                </label>
              ))}
            </div>
          )}
        </GlassCard>
      </PermissionGate>
    </div>
  );
}
