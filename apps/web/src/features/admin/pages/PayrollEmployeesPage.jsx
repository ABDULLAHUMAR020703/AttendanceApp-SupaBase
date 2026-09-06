import { useCallback, useEffect, useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';
import { payrollService } from '../services/payrollService';
import { adminService } from '../services/adminService';
import { Alert } from '../../../shared/components/ui/Alert';
import { Button } from '../../../shared/components/ui/Button';
import { Dialog } from '../../../shared/components/ui/Dialog';
import { Select } from '../../../shared/components/ui/Select';
import { Input } from '../../../shared/components/ui/Input';
import { EmptyStateBody } from '../../../shared/components/ui/EmptyState';
import { Badge } from '../../../shared/components/ui/Badge';
import { SlideOverPanel } from '../../../shared/components/SlideOverPanel';
import { GlassTable, TableCell, TableIdentity, TableRow } from '../../../shared/components/GlassTable';
import { PageActions } from '../../../shared/components/pageChrome';
import { formatCurrency, formatDate } from '../../../shared/lib/format';
import { CURRENCIES, DEFAULT_CURRENCY_CODE, currencyLabel } from '../../../shared/lib/currencies';

const todayKey = () => new Date().toISOString().slice(0, 10);

function currentProfile(profiles) {
  const today = todayKey();
  return (profiles || []).find((p) => p.effective_from <= today && (!p.effective_to || p.effective_to >= today)) || null;
}

const emptyForm = {
  salary_type: 'monthly',
  basic_salary: '',
  currency: DEFAULT_CURRENCY_CODE,
  overtime_enabled: false,
  overtime_rate: '',
  standard_working_days: 22,
  standard_working_hours: 8,
  tax_enabled: false,
  tax_type: 'fixed',
  tax_value: '',
  effective_from: '',
  effective_to: '',
};

export function PayrollEmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [profilesByEmployee, setProfilesByEmployee] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');

  const [activeEmployee, setActiveEmployee] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [users, profiles] = await Promise.all([adminService.getUsers(), payrollService.getSalaryProfiles()]);
      const activeUsers = (users || []).filter((u) => u.is_active !== false && u.role !== 'super_admin');
      setEmployees(activeUsers);
      const map = new Map();
      for (const profile of profiles || []) {
        const list = map.get(profile.employee_uid) || [];
        list.push(profile);
        map.set(profile.employee_uid, list);
      }
      for (const list of map.values()) list.sort((a, b) => (a.effective_from < b.effective_from ? 1 : -1));
      setProfilesByEmployee(map);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;
    return employees.filter((e) => `${e.name || ''} ${e.username || ''} ${e.department || ''}`.toLowerCase().includes(term));
  }, [employees, search]);

  const openCreate = (employee) => {
    setActiveEmployee(employee);
    setForm({ ...emptyForm, effective_from: todayKey() });
    setFormError('');
    setShowCreate(true);
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!(Number(form.basic_salary) > 0)) return setFormError('Salary must be greater than 0.');
    if (!form.effective_from) return setFormError('Effective from is required.');
    if (form.effective_to && form.effective_to <= form.effective_from) return setFormError('Effective to must be after effective from.');
    if (form.overtime_enabled && !(Number(form.overtime_rate) >= 0)) return setFormError('Overtime rate is required when overtime is enabled.');
    if (form.tax_enabled && !(Number(form.tax_value) >= 0)) return setFormError('Tax value is required when tax is enabled.');

    setSaving(true);
    try {
      await payrollService.createSalaryProfile({
        employee_uid: activeEmployee.uid,
        salary_type: form.salary_type,
        basic_salary: Number(form.basic_salary),
        currency: form.currency,
        overtime_enabled: form.overtime_enabled,
        overtime_rate: form.overtime_enabled ? Number(form.overtime_rate) : null,
        standard_working_days: Number(form.standard_working_days) || 22,
        standard_working_hours: Number(form.standard_working_hours) || 8,
        tax_enabled: form.tax_enabled,
        tax_type: form.tax_enabled ? form.tax_type : null,
        tax_value: form.tax_enabled ? Number(form.tax_value) : null,
        effective_from: form.effective_from,
        effective_to: form.effective_to || null,
      });
      setShowCreate(false);
      setNotice(`Salary profile saved for ${activeEmployee.name || activeEmployee.username}.`);
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const historyFor = activeEmployee && !showCreate ? profilesByEmployee.get(activeEmployee.uid) || [] : [];

  return (
    <div className="payroll-employees admin-page gap-4 animate-fade-up">
      <PageActions />

      {error && <Alert type="error">{error}</Alert>}
      {notice && (
        <Alert type="success" onDismiss={() => setNotice('')}>
          {notice}
        </Alert>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search employees"
        className="h-9 w-full max-w-xs rounded-lg border border-slate-200 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#00B0FF] focus:outline-none focus:ring-2 focus:ring-[#00B0FF]/20"
      />

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
        {!loading && filtered.length === 0 ? (
          <EmptyStateBody icon={Wallet} title="No employees found" description="Try a different search." className="py-12" />
        ) : (
          <GlassTable
            className="rounded-none border-0 shadow-none"
            loading={loading}
            skeletonRows={6}
            emptyTitle="No employees"
            emptyMessage="No employees match this search."
            columns={[
              { key: 'employee', label: 'Employee' },
              { key: 'department', label: 'Department' },
              { key: 'salary', label: 'Salary' },
              { key: 'type', label: 'Salary type' },
              { key: 'effective', label: 'Effective from' },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: <span className="sr-only">Actions</span> },
            ]}
          >
            {filtered.map((employee) => {
              const profile = currentProfile(profilesByEmployee.get(employee.uid));
              return (
                <TableRow key={employee.uid} onClick={() => setActiveEmployee(employee)}>
                  <TableCell>
                    <TableIdentity size="sm" name={employee.name || employee.username} secondary={employee.username} />
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{employee.department || '—'}</TableCell>
                  <TableCell className="text-sm tabular-nums text-slate-700">
                    {profile ? formatCurrency(profile.basic_salary, profile.currency) : '—'}
                  </TableCell>
                  <TableCell className="text-sm capitalize text-slate-600">{profile?.salary_type || '—'}</TableCell>
                  <TableCell className="text-sm text-slate-500">{profile ? formatDate(profile.effective_from) : '—'}</TableCell>
                  <TableCell>
                    <Badge tone={profile ? 'success' : 'neutral'}>{profile ? 'Configured' : 'Not configured'}</Badge>
                  </TableCell>
                  <TableCell>
                    <span data-row-action>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCreate(employee);
                        }}
                      >
                        {profile ? 'Update salary' : 'Set salary'}
                      </Button>
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </GlassTable>
        )}
      </div>

      <SlideOverPanel open={Boolean(activeEmployee) && !showCreate} onClose={() => setActiveEmployee(null)}>
        {activeEmployee && (
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-[17px] font-semibold tracking-tight text-slate-900">{activeEmployee.name || activeEmployee.username}</p>
                <p className="mt-1 text-sm text-slate-500">{activeEmployee.department || 'No department'}</p>
              </div>
              <Button size="sm" onClick={() => openCreate(activeEmployee)}>
                New salary
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.06em] text-slate-400">Salary history</p>
              {historyFor.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No salary configured yet.</p>
              ) : (
                <ul className="mt-2 divide-y divide-slate-100">
                  {historyFor.map((profile) => (
                    <li key={profile.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-slate-800">{formatCurrency(profile.basic_salary, profile.currency)}</span>
                        <Badge tone={!profile.effective_to || profile.effective_to >= todayKey() ? 'success' : 'neutral'}>
                          {!profile.effective_to || profile.effective_to >= todayKey() ? 'Current' : 'Past'}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDate(profile.effective_from)} → {profile.effective_to ? formatDate(profile.effective_to) : 'Present'}
                        <span className="text-slate-300"> · </span>
                        {profile.salary_type}
                      </p>
                      {profile.overtime_enabled && (
                        <p className="text-xs text-slate-400">Overtime {formatCurrency(profile.overtime_rate, profile.currency)}/hr</p>
                      )}
                      {profile.tax_enabled && (
                        <p className="text-xs text-slate-400">
                          Tax: {profile.tax_type === 'percentage' ? `${profile.tax_value}%` : formatCurrency(profile.tax_value, profile.currency)}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </SlideOverPanel>

      <Dialog
        open={showCreate}
        onClose={() => (saving ? null : setShowCreate(false))}
        title={`Set salary — ${activeEmployee?.name || activeEmployee?.username || ''}`}
        description="This creates a new effective-dated salary record. Historical payroll keeps using the salary that was in force at the time."
        size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" disabled={saving} onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button size="sm" loading={saving} onClick={submitCreate}>
              Save salary
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={submitCreate}>
          {formError && <Alert type="error">{formError}</Alert>}
          <div className="grid grid-cols-2 gap-3">
            <Select label="Salary type" value={form.salary_type} onChange={(e) => setForm((f) => ({ ...f, salary_type: e.target.value }))}>
              <option value="monthly">Monthly</option>
              <option value="hourly">Hourly</option>
            </Select>
            <Input
              label={form.salary_type === 'hourly' ? 'Hourly rate' : 'Basic salary'}
              type="number"
              min="0.01"
              step="0.01"
              required
              value={form.basic_salary}
              onChange={(e) => setForm((f) => ({ ...f, basic_salary: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Currency"
              value={form.currency}
              searchable
              searchPlaceholder="Search currencies…"
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {currencyLabel(c.code)}
                </option>
              ))}
            </Select>
            <Input
              label="Standard working days"
              type="number"
              min="1"
              value={form.standard_working_days}
              onChange={(e) => setForm((f) => ({ ...f, standard_working_days: e.target.value }))}
            />
            <Input
              label="Standard hours/day"
              type="number"
              min="1"
              value={form.standard_working_hours}
              onChange={(e) => setForm((f) => ({ ...f, standard_working_hours: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Effective from"
              type="date"
              required
              value={form.effective_from}
              onChange={(e) => setForm((f) => ({ ...f, effective_from: e.target.value }))}
            />
            <Input
              label="Effective to"
              optional
              hint="Leave blank for an open-ended salary."
              type="date"
              value={form.effective_to}
              onChange={(e) => setForm((f) => ({ ...f, effective_to: e.target.value }))}
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.overtime_enabled}
              onChange={(e) => setForm((f) => ({ ...f, overtime_enabled: e.target.checked }))}
            />
            Enable overtime
          </label>
          {form.overtime_enabled && (
            <Input
              label="Overtime rate (per hour)"
              type="number"
              min="0"
              step="0.01"
              value={form.overtime_rate}
              onChange={(e) => setForm((f) => ({ ...f, overtime_rate: e.target.value }))}
            />
          )}

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={form.tax_enabled} onChange={(e) => setForm((f) => ({ ...f, tax_enabled: e.target.checked }))} />
            Enable tax
          </label>
          {form.tax_enabled && (
            <div className="grid grid-cols-2 gap-3">
              <Select label="Tax type" value={form.tax_type} onChange={(e) => setForm((f) => ({ ...f, tax_type: e.target.value }))}>
                <option value="fixed">Fixed amount per period</option>
                <option value="percentage">Percentage of gross</option>
              </Select>
              <Input
                label={form.tax_type === 'percentage' ? 'Tax %' : 'Tax amount'}
                type="number"
                min="0"
                step="0.01"
                value={form.tax_value}
                onChange={(e) => setForm((f) => ({ ...f, tax_value: e.target.value }))}
              />
            </div>
          )}
        </form>
      </Dialog>
    </div>
  );
}
