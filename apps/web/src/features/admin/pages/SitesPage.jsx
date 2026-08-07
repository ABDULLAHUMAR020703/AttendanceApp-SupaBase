import { useCallback, useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { adminService } from '../services/adminService';
import { GlassCard } from '../../../shared/components/GlassCard';
import { PermissionGate } from '../../../shared/components/PermissionGate';
import { PERMISSIONS } from '../permissions';
import { useSilentPoll } from '../../../shared/hooks/useSilentPoll';
import { EmptyState } from '../../../shared/components/ui/EmptyState';
import { SkeletonCardList } from '../../../shared/components/ui/Skeleton';

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
          className="ui-btn-secondary ui-btn-sm"
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
        <button className="ui-btn-primary mb-4" onClick={createSite}>
          Create Site
        </button>
      </PermissionGate>

      <div className="space-y-2">
        {loading && <SkeletonCardList count={4} />}
        {!loading && sites.length === 0 && (
          <EmptyState
            icon={MapPin}
            title="No geofence sites yet"
            description="Add a site with a centre point and radius, then assign employees so their mobile check-ins can be verified."
          />
        )}
        {!loading &&
          sites.map((s) => (
            <GlassCard key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-3.5">
              <p className="text-body-tight font-medium text-ink">{s.name}</p>
              <p className="type-numeric text-caption text-ink-muted">
                {s.latitude}, {s.longitude} · {s.radius}m radius
              </p>
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
              className="ui-select"
              value={assignEmployeeUid}
              onChange={(e) => {
                setAssignEmployeeUid(e.target.value);
                loadEmployeeAssignments(e.target.value);
              }}
            >
              <option value="">Select employee</option>
              {users.map((u) => (
                <option key={u.uid} value={u.uid}>{u.name || u.username} ({u.department})</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!assignEmployeeUid || assignSaving}
              onClick={saveAssignments}
              className="ui-btn-primary ui-btn-sm"
            >
              {assignSaving ? 'Saving…' : 'Save assignments'}
            </button>
          </div>
          {assignEmployeeUid && (
            <div className="flex flex-wrap gap-2">
              {sites.map((s) => (
                <label key={s.id} className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors duration-200 ${assignSiteIds.includes(s.id) ? 'border-accent-200 bg-accent-100 font-semibold text-accent-800' : 'border-hairline bg-white text-ink-muted hover:border-accent-200 hover:text-accent-800'}`}>
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
