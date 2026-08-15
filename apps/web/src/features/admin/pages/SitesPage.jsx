import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { adminService } from '../services/adminService';
import { useAuthStore } from '../../auth/store/authStore';
import { Alert } from '../../../shared/components/ui/Alert';
import { Select } from '../../../shared/components/ui/Select';
import { hasPermission, PERMISSIONS } from '../permissions';
import { useSilentPoll } from '../../../shared/hooks/useSilentPoll';
import { GeofenceMap, zoomForRadius } from '../components/GeofenceMap';

const EMPTY_DRAFT = {
  name: '',
  department_id: '',
  latitude: '',
  longitude: '',
  radius: 150,
  assigneeUids: [],
};

const STEPS = [
  { id: 1, label: 'Details' },
  { id: 2, label: 'Position' },
  { id: 3, label: 'Radius' },
  { id: 4, label: 'People' },
  { id: 5, label: 'Review' },
];

const addressCache = new Map();

function formatMeters(value) {
  const meters = Number(value);
  if (!Number.isFinite(meters) || meters <= 0) return '-';
  if (meters >= 1000) return `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1)} km`;
  return `${Math.round(meters)} m`;
}

function formatCoord(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(5) : '-';
}

function shortAddress(value) {
  if (!value) return '';
  return String(value)
    .split(',')
    .slice(0, 3)
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');
}

function coordKey(lat, lng) {
  return `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
}

async function lookupAddress(lat, lng) {
  const key = coordKey(lat, lng);
  if (addressCache.has(key)) return addressCache.get(key);
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`,
      { headers: { Accept: 'application/json' } }
    );
    if (!response.ok) throw new Error('geocode failed');
    const data = await response.json();
    const label = data?.display_name ? shortAddress(data.display_name) : `${formatCoord(lat)}, ${formatCoord(lng)}`;
    addressCache.set(key, label);
    return label;
  } catch {
    const fallback = `${formatCoord(lat)}, ${formatCoord(lng)}`;
    addressCache.set(key, fallback);
    return fallback;
  }
}

export function SitesPage() {
  const { user } = useAuthStore();
  const [sites, setSites] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [addresses, setAddresses] = useState({});
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [creating, setCreating] = useState(false);
  const [wizard, setWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [assignEmployeeUid, setAssignEmployeeUid] = useState('');
  const [assignSiteIds, setAssignSiteIds] = useState([]);
  const [assignSaving, setAssignSaving] = useState(false);
  const [siteAssignSaving, setSiteAssignSaving] = useState(false);
  const geocodeQueue = useRef(0);

  const canManage = hasPermission(user, PERMISSIONS.MANAGE_GEOFENCING);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    if (!silent) setError('');
    try {
      const [sitesData, departmentsData, usersData, assignmentData] = await Promise.all([
        adminService.getSites(),
        adminService.getDepartments().catch(() => []),
        adminService.getUsers().catch(() => []),
        canManage ? adminService.getEmployeeSites().catch(() => []) : Promise.resolve([]),
      ]);
      setSites(sitesData || []);
      setDepartments(departmentsData || []);
      setUsers((usersData || []).filter((row) => row.role === 'employee' || row.role === 'manager'));
      setAssignments(assignmentData || []);
    } catch (err) {
      if (!silent) setError(err?.response?.data?.error || err?.message || 'Failed to load sites');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [canManage]);

  useEffect(() => {
    load();
  }, [load]);

  useSilentPoll(load, 30000);

  useEffect(() => {
    if (!sites.length) return undefined;
    let cancelled = false;
    const token = (geocodeQueue.current += 1);
    (async () => {
      for (const site of sites) {
        if (cancelled || token !== geocodeQueue.current) return;
        if (addresses[site.id]) continue;
        const label = await lookupAddress(site.latitude, site.longitude);
        if (cancelled) return;
        setAddresses((current) => (current[site.id] ? current : { ...current, [site.id]: label }));
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    })();
    return () => {
      cancelled = true;
    };
    // Geocode only when the site set changes, not on every address tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sites.map((site) => site.id).join('|')]);

  const peopleBySite = useMemo(() => {
    const usersByUid = new Map(users.map((row) => [String(row.uid), row]));
    const map = new Map();
    for (const row of assignments) {
      const siteId = row.site_id;
      if (!map.has(siteId)) map.set(siteId, []);
      const person = usersByUid.get(String(row.employee_uid));
      map.get(siteId).push({
        uid: row.employee_uid,
        name: person?.name || person?.username || row.employee_uid,
        department: person?.department || '',
      });
    }
    return map;
  }, [assignments, users]);

  const filteredSites = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sites.filter((site) => {
      if (!q) return true;
      const address = addresses[site.id] || '';
      return `${site.name} ${address}`.toLowerCase().includes(q);
    });
  }, [sites, addresses, query]);

  const selected = sites.find((site) => site.id === selectedId) || filteredSites[0] || sites[0] || null;

  useEffect(() => {
    if (selected && !sites.some((site) => site.id === selectedId)) {
      setSelectedId(selected.id);
    }
  }, [selected, selectedId, sites]);

  const mapCenter = useMemo(() => {
    if (wizard && draft.latitude !== '' && Number.isFinite(Number(draft.latitude)) && Number.isFinite(Number(draft.longitude))) {
      return { lat: Number(draft.latitude), lng: Number(draft.longitude) };
    }
    if (selected) return { lat: Number(selected.latitude), lng: Number(selected.longitude) };
    if (sites[0]) return { lat: Number(sites[0].latitude), lng: Number(sites[0].longitude) };
    return { lat: 24.8607, lng: 67.0011 };
  }, [wizard, draft.latitude, draft.longitude, selected, sites]);

  const mapZoom = useMemo(() => {
    const radius = wizard ? Number(draft.radius) || 150 : Number(selected?.radius) || 150;
    return zoomForRadius(mapCenter.lat, radius, { width: 720, height: 560 });
  }, [wizard, draft.radius, selected, mapCenter.lat]);

  const mapPreview =
    wizard && draft.latitude !== '' && draft.longitude !== ''
      ? {
          latitude: Number(draft.latitude),
          longitude: Number(draft.longitude),
          radius: Number(draft.radius) || 150,
          name: draft.name || 'New location',
        }
      : null;

  const departmentName = (id) => departments.find((row) => String(row.id) === String(id))?.name || '-';

  const startWizard = () => {
    setWizard(true);
    setStep(1);
    setDraft({
      ...EMPTY_DRAFT,
      department_id: departments[0]?.id || '',
    });
    setNotice('');
    setError('');
  };

  const closeWizard = () => {
    setWizard(false);
    setStep(1);
    setDraft(EMPTY_DRAFT);
    setCreating(false);
  };

  const canAdvance = () => {
    if (step === 1) return Boolean(draft.name.trim() && draft.department_id);
    if (step === 2) return draft.latitude !== '' && draft.longitude !== '' && Number.isFinite(Number(draft.latitude)) && Number.isFinite(Number(draft.longitude));
    if (step === 3) return Number(draft.radius) > 0;
    return true;
  };

  const createSite = async () => {
    setCreating(true);
    setError('');
    try {
      const created = await adminService.createSite({
        name: draft.name.trim(),
        latitude: Number(draft.latitude),
        longitude: Number(draft.longitude),
        radius: Number(draft.radius),
        department_id: draft.department_id,
      });
      const site = created?.data || created;
      const siteId = site?.id;
      if (siteId && draft.assigneeUids.length) {
        await Promise.all(
          draft.assigneeUids.map(async (uid) => {
            const current = await adminService.getEmployeeSites(uid).catch(() => []);
            const ids = Array.from(new Set([...(current || []).map((row) => row.site_id), siteId]));
            await adminService.setEmployeeSites(uid, ids);
          })
        );
      }
      setNotice('Location created.');
      closeWizard();
      await load();
      if (siteId) setSelectedId(siteId);
    } catch (err) {
      console.error('[SitesPage] Failed to create site:', err);
      setError(err?.message || 'Failed to create site');
    } finally {
      setCreating(false);
    }
  };

  const loadEmployeeAssignments = async (uid) => {
    setAssignEmployeeUid(uid);
    if (!uid) {
      setAssignSiteIds([]);
      return;
    }
    const rows = await adminService.getEmployeeSites(uid).catch(() => []);
    setAssignSiteIds((rows || []).map((row) => row.site_id));
  };

  const saveAssignments = async () => {
    setAssignSaving(true);
    setError('');
    try {
      await adminService.setEmployeeSites(assignEmployeeUid, assignSiteIds);
      setNotice('Assignments saved.');
      const rows = await adminService.getEmployeeSites().catch(() => []);
      setAssignments(rows || []);
    } catch (err) {
      setError(err.message || 'Failed to save assignments');
    } finally {
      setAssignSaving(false);
    }
  };

  const toggleSite = (siteId) => {
    setAssignSiteIds((prev) => (prev.includes(siteId) ? prev.filter((id) => id !== siteId) : [...prev, siteId]));
  };

  const toggleAssignee = (uid) => {
    setDraft((current) => ({
      ...current,
      assigneeUids: current.assigneeUids.includes(uid)
        ? current.assigneeUids.filter((id) => id !== uid)
        : [...current.assigneeUids, uid],
    }));
  };

  const togglePersonOnSite = async (siteId, uid, assigned) => {
    setSiteAssignSaving(true);
    setError('');
    try {
      const current = await adminService.getEmployeeSites(uid);
      const ids = (current || []).map((row) => row.site_id);
      const next = assigned ? Array.from(new Set([...ids, siteId])) : ids.filter((id) => id !== siteId);
      await adminService.setEmployeeSites(uid, next);
      const rows = await adminService.getEmployeeSites().catch(() => []);
      setAssignments(rows || []);
    } catch (err) {
      setError(err.message || 'Failed to update assignment');
    } finally {
      setSiteAssignSaving(false);
    }
  };

  const assigned = selected ? peopleBySite.get(selected.id) || [] : [];
  const assignedUids = new Set(assigned.map((row) => String(row.uid)));

  return (
    <div className="geofencing-directory admin-page gap-4 animate-fade-up">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Geofencing</h1>
          <p className="mt-1 text-sm text-slate-500">Control where location-based attendance can be recorded.</p>
        </div>
        {canManage && !wizard && (
          <button type="button" onClick={startWizard} className="ui-btn-primary ui-btn-sm">
            Add location
          </button>
        )}
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {notice && (
        <Alert type="success" onDismiss={() => setNotice('')}>
          {notice}
        </Alert>
      )}

      <div className="admin-fill grid min-h-[34rem] grid-cols-[24rem_1fr] overflow-hidden rounded-xl border border-slate-200">
        <aside className="flex min-h-0 flex-col border-b border-slate-200 lg:order-1 lg:w-96 lg:shrink-0 lg:border-b-0 lg:border-r">
          {wizard ? (
            <WizardPanel
              step={step}
              draft={draft}
              departments={departments}
              users={users}
              creating={creating}
              canAdvance={canAdvance()}
              departmentName={departmentName}
              onDraft={setDraft}
              onStep={setStep}
              onCancel={closeWizard}
              onToggleAssignee={toggleAssignee}
              onCreate={createSite}
            />
          ) : (
            <>
              <div className="border-b border-slate-200 p-3">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search locations"
                  aria-label="Search locations"
                  className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#00B0FF] focus:outline-none focus:ring-2 focus:ring-[#00B0FF]/20"
                />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {loading && (
                  <div className="space-y-2 p-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="skeleton h-16 rounded-lg" />
                    ))}
                  </div>
                )}
                {!loading && filteredSites.length === 0 && (
                  <div className="px-4 py-10 text-center">
                    <p className="text-sm font-medium text-slate-800">No geofence sites yet</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Add a site with a centre point and radius, then assign people so mobile check-ins can be verified.
                    </p>
                  </div>
                )}
                {!loading &&
                  filteredSites.map((site) => {
                    const people = peopleBySite.get(site.id) || [];
                    const active = selected?.id === site.id;
                    return (
                      <button
                        key={site.id}
                        type="button"
                        onClick={() => setSelectedId(site.id)}
                        className={`w-full border-b border-slate-100 px-4 py-3 text-left transition-colors ${
                          active ? 'bg-[#F4FBFF]' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate text-sm font-medium text-slate-900">{site.name}</p>
                          <QuietStatus active label="Active" />
                        </div>
                        <p className="mt-0.5 truncate text-xs text-slate-400">
                          {addresses[site.id] || `${formatCoord(site.latitude)}, ${formatCoord(site.longitude)}`}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatMeters(site.radius)}
                          <span className="text-slate-300"> / </span>
                          {people.length} {people.length === 1 ? 'person' : 'people'}
                        </p>
                      </button>
                    );
                  })}
              </div>
              {selected && (
                <LocationDetail
                  site={selected}
                  address={addresses[selected.id]}
                  people={assigned}
                  users={users}
                  assignedUids={assignedUids}
                  departmentName={departmentName(selected.department_id)}
                  canManage={canManage}
                  saving={siteAssignSaving}
                  onTogglePerson={togglePersonOnSite}
                  assignEmployeeUid={assignEmployeeUid}
                  assignSiteIds={assignSiteIds}
                  assignSaving={assignSaving}
                  sites={sites}
                  onPickEmployee={loadEmployeeAssignments}
                  onToggleSite={toggleSite}
                  onSaveAssignments={saveAssignments}
                />
              )}
            </>
          )}
        </aside>

        <div className="relative h-96 min-w-0 flex-1 bg-slate-100">
          <GeofenceMap
            center={mapCenter}
            zoom={mapZoom}
            sites={sites}
            selectedId={wizard ? null : selected?.id}
            preview={mapPreview}
            pickMode={wizard && (step === 2 || step === 3)}
            onSelect={(id) => {
              if (wizard) return;
              setSelectedId(id);
            }}
            onPick={({ lat, lng }) => {
              setDraft((current) => ({ ...current, latitude: String(lat), longitude: String(lng) }));
            }}
            className="h-full w-full"
          />
        </div>
      </div>
    </div>
  );
}

function WizardPanel({
  step,
  draft,
  departments,
  users,
  creating,
  canAdvance,
  departmentName,
  onDraft,
  onStep,
  onCancel,
  onToggleAssignee,
  onCreate,
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-slate-200 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Add location</p>
        <ol className="mt-2 flex gap-1">
          {STEPS.map((item) => (
            <li
              key={item.id}
              className={`h-1 flex-1 rounded-full ${item.id <= step ? 'bg-[#00B0FF]' : 'bg-slate-200'}`}
            />
          ))}
        </ol>
        <p className="mt-2 text-xs text-slate-400">
          Step {step} of {STEPS.length} / {STEPS[step - 1].label}
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {step === 1 && (
          <div className="space-y-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.06em] text-slate-400">Location name</span>
              <input
                value={draft.name}
                onChange={(e) => onDraft((current) => ({ ...current, name: e.target.value }))}
                className="ui-input"
                placeholder="Headquarters"
                autoFocus
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-medium uppercase tracking-[0.06em] text-slate-400">Department</span>
              <Select
                value={draft.department_id}
                onChange={(e) => onDraft((current) => ({ ...current, department_id: e.target.value }))}
              >
                <option value="">Select department</option>
                {departments.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-3 text-sm text-slate-600">
            <p>Click the map to place the centre. You can drag and zoom to refine it.</p>
            <p className="tabular-nums text-slate-500">
              {draft.latitude && draft.longitude
                ? `${formatCoord(draft.latitude)}, ${formatCoord(draft.longitude)}`
                : 'No point selected yet.'}
            </p>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-3">
            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.06em] text-slate-400">Radius</span>
              <input
                type="range"
                min="25"
                max="2000"
                step="25"
                value={draft.radius}
                onChange={(e) => onDraft((current) => ({ ...current, radius: Number(e.target.value) }))}
                className="w-full accent-[#00B0FF]"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="10"
                  value={draft.radius}
                  onChange={(e) => onDraft((current) => ({ ...current, radius: Number(e.target.value) }))}
                  className="ui-input w-28"
                />
                <span className="text-sm text-slate-500">meters</span>
              </div>
            </label>
            <p className="text-sm text-slate-500">Attendance can be recorded inside this circle.</p>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">Optional. Assign people now, or do it after the site exists.</p>
            {users.length === 0 ? (
              <p className="text-sm text-slate-500">No employees available to assign.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {users.map((row) => (
                  <li key={row.uid}>
                    <label className="flex cursor-pointer items-center gap-2 py-2 text-sm">
                      <input
                        type="checkbox"
                        checked={draft.assigneeUids.includes(row.uid)}
                        onChange={() => onToggleAssignee(row.uid)}
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-slate-800">{row.name || row.username}</span>
                        <span className="block truncate text-xs text-slate-400">{row.department}</span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {step === 5 && (
          <dl className="text-sm">
            <ReviewRow label="Name">{draft.name}</ReviewRow>
            <ReviewRow label="Department">{departmentName(draft.department_id)}</ReviewRow>
            <ReviewRow label="Centre">
              {formatCoord(draft.latitude)}, {formatCoord(draft.longitude)}
            </ReviewRow>
            <ReviewRow label="Radius">{formatMeters(draft.radius)}</ReviewRow>
            <ReviewRow label="People">{draft.assigneeUids.length} assigned</ReviewRow>
          </dl>
        )}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-200 p-3">
        <button type="button" onClick={onCancel} className="ui-btn-ghost ui-btn-sm" disabled={creating}>
          Cancel
        </button>
        <div className="flex gap-2">
          {step > 1 && (
            <button type="button" onClick={() => onStep(step - 1)} className="ui-btn-secondary ui-btn-sm" disabled={creating}>
              Back
            </button>
          )}
          {step < 5 ? (
            <button type="button" onClick={() => onStep(step + 1)} disabled={!canAdvance} className="ui-btn-primary ui-btn-sm">
              Continue
            </button>
          ) : (
            <button type="button" onClick={onCreate} disabled={creating || !canAdvance} className="ui-btn-primary ui-btn-sm">
              {creating ? 'Creating...' : 'Create location'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function LocationDetail({
  site,
  address,
  people,
  users,
  assignedUids,
  departmentName,
  canManage,
  saving,
  onTogglePerson,
  assignEmployeeUid,
  assignSiteIds,
  assignSaving,
  sites,
  onPickEmployee,
  onToggleSite,
  onSaveAssignments,
}) {
  return (
    <div className="max-h-[48%] overflow-y-auto border-t border-slate-200 p-4">
      <p className="text-sm font-semibold text-slate-900">{site.name}</p>
      <dl className="mt-2">
        <DetailField label="Address">{address || `${formatCoord(site.latitude)}, ${formatCoord(site.longitude)}`}</DetailField>
        <DetailField label="Radius">{formatMeters(site.radius)}</DetailField>
        <DetailField label="Status"><QuietStatus active label="Active" /></DetailField>
        <DetailField label="Department">{departmentName}</DetailField>
        <DetailField label="Attendance">Check-in must be inside this geofence.</DetailField>
      </dl>

      <p className="mt-4 text-xs font-medium uppercase tracking-[0.06em] text-slate-400">Assigned workforce</p>
      {people.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No one is assigned to this location.</p>
      ) : (
        <ul className="mt-1 divide-y divide-slate-100">
          {people.map((person) => (
            <li key={person.uid} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0">
                <span className="block truncate text-sm text-slate-800">{person.name}</span>
                <span className="block truncate text-xs text-slate-400">{person.department}</span>
              </span>
              {canManage && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onTogglePerson(site.id, person.uid, false)}
                  className="text-xs font-medium text-slate-400 hover:text-rose-500"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <details className="geofence-advanced mt-3">
          <summary>Assign people</summary>
          <ul className="mt-2 max-h-40 overflow-y-auto divide-y divide-slate-100">
            {users.map((row) => {
              const checked = assignedUids.has(String(row.uid));
              return (
                <li key={row.uid}>
                  <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm">
                    <input
                      type="checkbox"
                      disabled={saving}
                      checked={checked}
                      onChange={() => onTogglePerson(site.id, row.uid, !checked)}
                    />
                    <span className="truncate text-slate-700">{row.name || row.username}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </details>
      )}

      {canManage && (
        <details className="geofence-advanced mt-2">
          <summary>Assign sites to an employee</summary>
          <div className="mt-3 space-y-3">
            <Select
              value={assignEmployeeUid}
              onChange={(e) => onPickEmployee(e.target.value)}
            >
              <option value="">Select employee</option>
              {users.map((row) => (
                <option key={row.uid} value={row.uid}>
                  {row.name || row.username} ({row.department})
                </option>
              ))}
            </Select>
            {assignEmployeeUid && (
              <div className="flex flex-wrap gap-2">
                {sites.map((item) => (
                  <label
                    key={item.id}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1 text-xs ${
                      assignSiteIds.includes(item.id)
                        ? 'border-[#00B0FF]/40 bg-[#F0FAFF] text-slate-800'
                        : 'border-slate-200 text-slate-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={assignSiteIds.includes(item.id)}
                      onChange={() => onToggleSite(item.id)}
                    />
                    {item.name}
                  </label>
                ))}
              </div>
            )}
            <button
              type="button"
              disabled={!assignEmployeeUid || assignSaving}
              onClick={onSaveAssignments}
              className="ui-btn-primary ui-btn-sm"
            >
              {assignSaving ? 'Saving...' : 'Save assignments'}
            </button>
          </div>
        </details>
      )}
    </div>
  );
}

function QuietStatus({ active, label }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-slate-600">
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-300'}`} aria-hidden />
      {label}
    </span>
  );
}

function DetailField({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-2">
      <dt className="shrink-0 text-[11px] font-medium uppercase tracking-[0.06em] text-slate-400">{label}</dt>
      <dd className="min-w-0 text-right text-sm text-slate-800">{children || '-'}</dd>
    </div>
  );
}

function ReviewRow({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-2">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-right text-slate-800">{children}</dd>
    </div>
  );
}