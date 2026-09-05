import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Banknote, Trash2 } from 'lucide-react';
import { payrollService } from '../services/payrollService';
import { adminService } from '../services/adminService';
import { Alert } from '../../../shared/components/ui/Alert';
import { Button } from '../../../shared/components/ui/Button';
import { Dialog } from '../../../shared/components/ui/Dialog';
import { Select } from '../../../shared/components/ui/Select';
import { Input } from '../../../shared/components/ui/Input';
import { EmptyStateBody } from '../../../shared/components/ui/EmptyState';
import { SlideOverPanel } from '../../../shared/components/SlideOverPanel';
import {
  GlassTable,
  TableCell,
  TablePagination,
  TableRow,
} from '../../../shared/components/GlassTable';
import { PageActions } from '../../../shared/components/pageChrome';
import { formatCurrency, formatDateRange } from '../../../shared/lib/format';
import { StatusPill } from './PayrollDashboardPage';

const EARNING_TYPES = [
  { value: 'allowance', label: 'Allowance' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'overtime', label: 'Overtime adjustment' },
  { value: 'other', label: 'Other earning' },
];
const DEDUCTION_TYPES = [
  { value: 'loan', label: 'Loan' },
  { value: 'advance', label: 'Advance' },
  { value: 'absence', label: 'Absence adjustment' },
  { value: 'other', label: 'Other deduction' },
];

function DetailField({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 py-2.5 last:border-0">
      <dt className="shrink-0 text-xs font-medium text-slate-400">{label}</dt>
      <dd className="min-w-0 text-right text-sm text-slate-800">{children ?? '—'}</dd>
    </div>
  );
}

export function PayrollPeriodPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [period, setPeriod] = useState(null);
  const [records, setRecords] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [missingProfiles, setMissingProfiles] = useState(null);
  const [busy, setBusy] = useState(false);

  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [activeRecordId, setActiveRecordId] = useState(null);
  const [activeRecord, setActiveRecord] = useState(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [adjustmentOpen, setAdjustmentOpen] = useState(null); // 'earning' | 'deduction' | null
  const [adjustmentForm, setAdjustmentForm] = useState({ type: '', amount: '', reason: '' });
  const [adjustmentError, setAdjustmentError] = useState('');
  const [adjustmentSaving, setAdjustmentSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [periodData, recordData, departmentData] = await Promise.all([
        payrollService.getPeriod(id),
        payrollService.getPeriodRecords(id, {
          department_id: departmentFilter || undefined,
          status: statusFilter || undefined,
          search: search || undefined,
        }),
        adminService.getDepartments().catch(() => []),
      ]);
      setPeriod(periodData);
      setRecords(recordData || []);
      setDepartments(departmentData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, departmentFilter, statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [departmentFilter, statusFilter, search]);

  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return records.slice(start, start + pageSize);
  }, [records, page, pageSize]);

  const runAction = async (action, successMessage) => {
    setBusy(true);
    setError('');
    setMissingProfiles(null);
    try {
      await action();
      setNotice(successMessage);
      await load();
    } catch (err) {
      if (err.data?.missing_salary_profiles) {
        setMissingProfiles(err.data.missing_salary_profiles);
      }
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const openRecord = async (record) => {
    setActiveRecordId(record.id);
    setRecordLoading(true);
    try {
      const full = await payrollService.getRecord(record.id);
      setActiveRecord(full);
    } catch (err) {
      setError(err.message);
    } finally {
      setRecordLoading(false);
    }
  };

  const closeRecord = () => {
    setActiveRecordId(null);
    setActiveRecord(null);
    setAdjustmentOpen(null);
  };

  const submitAdjustment = async (event) => {
    event.preventDefault();
    setAdjustmentError('');
    if (!adjustmentForm.type) return setAdjustmentError('Choose an adjustment type.');
    if (!(Number(adjustmentForm.amount) > 0)) return setAdjustmentError('Amount must be greater than 0.');
    if (!adjustmentForm.reason.trim()) return setAdjustmentError('A reason is required for every manual adjustment.');
    setAdjustmentSaving(true);
    try {
      await payrollService.addAdjustment(activeRecordId, {
        kind: adjustmentOpen,
        type: adjustmentForm.type,
        amount: Number(adjustmentForm.amount),
        reason: adjustmentForm.reason.trim(),
      });
      setAdjustmentOpen(null);
      setAdjustmentForm({ type: '', amount: '', reason: '' });
      const full = await payrollService.getRecord(activeRecordId);
      setActiveRecord(full);
      await load();
    } catch (err) {
      setAdjustmentError(err.message);
    } finally {
      setAdjustmentSaving(false);
    }
  };

  const removeAdjustment = async (kind, adjustmentId) => {
    setBusy(true);
    try {
      await payrollService.deleteAdjustment(kind, adjustmentId);
      const full = await payrollService.getRecord(activeRecordId);
      setActiveRecord(full);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const locked = period?.status === 'locked';

  return (
    <div className="payroll-period admin-page gap-4 animate-fade-up">
      <PageActions>
        <Button variant="ghost" size="sm" onClick={() => navigate('/payroll')}>
          <ArrowLeft className="h-4 w-4" /> All periods
        </Button>
        {period?.status === 'draft' && (
          <Button size="sm" loading={busy} onClick={() => runAction(() => payrollService.calculatePeriod(id), 'Payroll calculated.')}>
            Calculate payroll
          </Button>
        )}
        {period?.status === 'calculated' && (
          <>
            <Button variant="secondary" size="sm" loading={busy} onClick={() => runAction(() => payrollService.recalculatePeriod(id), 'Payroll recalculated.')}>
              Recalculate
            </Button>
            <Button size="sm" loading={busy} onClick={() => runAction(() => payrollService.reviewPeriod(id), 'Payroll marked reviewed.')}>
              Mark reviewed
            </Button>
          </>
        )}
        {period?.status === 'reviewed' && (
          <Button size="sm" loading={busy} onClick={() => runAction(() => payrollService.approvePeriod(id), 'Payroll approved.')}>
            Approve payroll
          </Button>
        )}
        {period?.status === 'approved' && (
          <Button variant="danger" size="sm" loading={busy} onClick={() => runAction(() => payrollService.lockPeriod(id), 'Payroll locked.')}>
            Lock payroll
          </Button>
        )}
      </PageActions>

      {error && <Alert type="error">{error}</Alert>}
      {notice && (
        <Alert type="success" onDismiss={() => setNotice('')}>
          {notice}
        </Alert>
      )}
      {missingProfiles && missingProfiles.length > 0 && (
        <Alert type="warning" onDismiss={() => setMissingProfiles(null)}>
          <p className="font-medium">These employees are missing a salary profile for this period:</p>
          <ul className="mt-1 list-disc pl-5 text-sm">
            {missingProfiles.map((m) => (
              <li key={m.uid}>{m.name}</li>
            ))}
          </ul>
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => navigate('/payroll/employees')}>
            Configure salaries
          </Button>
        </Alert>
      )}

      {period && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-5 py-4">
          <div>
            <p className="text-lg font-semibold text-slate-900">{formatDateRange(period.period_start, period.period_end)}</p>
            <p className="text-sm text-slate-500">{period.pay_date ? `Pay date ${period.pay_date}` : 'No pay date set'}</p>
          </div>
          <StatusPill status={period.status} />
        </div>
      )}

      <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search employee"
          className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#00B0FF] focus:outline-none focus:ring-2 focus:ring-[#00B0FF]/20 sm:max-w-xs"
        />
        <Select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} size="sm" className="w-auto" aria-label="Department filter">
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>
        <p className="text-xs tabular-nums text-slate-400">{records.length} employees</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
        {!loading && records.length === 0 ? (
          <EmptyStateBody
            icon={Banknote}
            title="Nothing to review yet"
            description="Calculate this payroll period to pull attendance and leave and generate payroll records for every employee."
            className="py-12"
          />
        ) : (
          <>
            <GlassTable
              className="rounded-none border-0 shadow-none"
              loading={loading}
              skeletonRows={6}
              emptyTitle="No matching employees"
              emptyMessage="Try a different search or department."
              columns={[
                { key: 'employee', label: 'Employee' },
                { key: 'department', label: 'Department' },
                { key: 'basic', label: 'Basic' },
                { key: 'working', label: 'Working days' },
                { key: 'worked', label: 'Worked' },
                { key: 'paid_leave', label: 'Paid leave' },
                { key: 'unpaid_leave', label: 'Unpaid leave' },
                { key: 'overtime', label: 'Overtime' },
                { key: 'gross', label: 'Gross' },
                { key: 'deductions', label: 'Deductions' },
                { key: 'tax', label: 'Tax' },
                { key: 'net', label: 'Net' },
                { key: 'status', label: 'Status' },
              ]}
            >
              {paged.map((record) => (
                <TableRow key={record.id} onClick={() => openRecord(record)}>
                  <TableCell className="text-sm font-medium text-slate-800">{record.employee_name}</TableCell>
                  <TableCell className="text-sm text-slate-600">{record.department_name || '—'}</TableCell>
                  <TableCell className="text-sm tabular-nums text-slate-600">{formatCurrency(record.basic_salary, record.currency)}</TableCell>
                  <TableCell className="text-sm tabular-nums text-slate-500">{record.working_days}</TableCell>
                  <TableCell className="text-sm tabular-nums text-slate-500">{record.worked_days}</TableCell>
                  <TableCell className="text-sm tabular-nums text-slate-500">{record.paid_leave_days}</TableCell>
                  <TableCell className="text-sm tabular-nums text-slate-500">{record.unpaid_leave_days}</TableCell>
                  <TableCell className="text-sm tabular-nums text-slate-500">{record.overtime_hours}h</TableCell>
                  <TableCell className="text-sm tabular-nums text-slate-700">{formatCurrency(record.gross_salary, record.currency)}</TableCell>
                  <TableCell className="text-sm tabular-nums text-slate-500">
                    {formatCurrency((record.deductions_amount || 0), record.currency)}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums text-slate-500">{formatCurrency(record.tax_amount, record.currency)}</TableCell>
                  <TableCell className="text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(record.net_salary, record.currency)}</TableCell>
                  <TableCell>
                    <StatusPill status={record.status} />
                  </TableCell>
                </TableRow>
              ))}
            </GlassTable>
            {!loading && records.length > 0 && (
              <TablePagination
                className="border-t border-slate-100 px-4 py-3"
                page={page}
                pageSize={pageSize}
                total={records.length}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            )}
          </>
        )}
      </div>

      <SlideOverPanel open={Boolean(activeRecordId)} onClose={closeRecord}>
        {activeRecord && !recordLoading && (
          <div className="flex h-full flex-col">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="truncate text-[17px] font-semibold tracking-tight text-slate-900">{activeRecord.employee_name}</p>
              <p className="mt-1 text-sm text-slate-500">
                {activeRecord.department_name || 'No department'} <span className="text-slate-300">·</span> {activeRecord.salary_type}
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-[0.06em] text-slate-400">Attendance &amp; leave</p>
              <dl className="mt-1">
                <DetailField label="Working days">{activeRecord.working_days}</DetailField>
                <DetailField label="Worked days">{activeRecord.worked_days}</DetailField>
                <DetailField label="Absent days">{activeRecord.absent_days}</DetailField>
                <DetailField label="Paid leave">{activeRecord.paid_leave_days}</DetailField>
                <DetailField label="Unpaid leave">{activeRecord.unpaid_leave_days}</DetailField>
                <DetailField label="Regular hours">{activeRecord.regular_hours}</DetailField>
                <DetailField label="Overtime hours">{activeRecord.overtime_hours}</DetailField>
              </dl>

              <p className="mt-5 text-xs font-medium uppercase tracking-[0.06em] text-slate-400">Earnings</p>
              <dl className="mt-1">
                {(activeRecord.earnings || []).map((earning) => (
                  <DetailField key={earning.id} label={`${earning.name}${earning.is_manual ? ' (manual)' : ''}`}>
                    <span className="flex items-center justify-end gap-2">
                      {formatCurrency(earning.amount, activeRecord.currency)}
                      {earning.is_manual && !locked && (
                        <button
                          type="button"
                          aria-label="Remove adjustment"
                          onClick={() => removeAdjustment('earning', earning.id)}
                          className="ui-icon-btn ui-icon-btn-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  </DetailField>
                ))}
              </dl>

              <p className="mt-5 text-xs font-medium uppercase tracking-[0.06em] text-slate-400">Deductions</p>
              <dl className="mt-1">
                {(activeRecord.deductions || []).length === 0 && <p className="py-2 text-sm text-slate-400">None</p>}
                {(activeRecord.deductions || []).map((deduction) => (
                  <DetailField key={deduction.id} label={`${deduction.name}${deduction.is_manual ? ' (manual)' : ''}`}>
                    <span className="flex items-center justify-end gap-2">
                      {formatCurrency(deduction.amount, activeRecord.currency)}
                      {deduction.is_manual && !locked && (
                        <button
                          type="button"
                          aria-label="Remove adjustment"
                          onClick={() => removeAdjustment('deduction', deduction.id)}
                          className="ui-icon-btn ui-icon-btn-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  </DetailField>
                ))}
              </dl>

              <dl className="mt-5 border-t border-slate-200 pt-2">
                <DetailField label="Gross salary">{formatCurrency(activeRecord.gross_salary, activeRecord.currency)}</DetailField>
                <DetailField label="Total deductions">{formatCurrency((activeRecord.deductions_amount || 0) + (activeRecord.tax_amount || 0), activeRecord.currency)}</DetailField>
                <DetailField label="Net salary">
                  <span className="text-base font-semibold text-slate-900">{formatCurrency(activeRecord.net_salary, activeRecord.currency)}</span>
                </DetailField>
              </dl>

              {!locked && (
                <div className="mt-5 flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setAdjustmentOpen('earning')}>
                    Add earning
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setAdjustmentOpen('deduction')}>
                    Add deduction
                  </Button>
                </div>
              )}
              {locked && <p className="mt-5 text-xs text-slate-400">This payroll record is locked and cannot be adjusted.</p>}
            </div>
          </div>
        )}
      </SlideOverPanel>

      <Dialog
        open={Boolean(adjustmentOpen)}
        onClose={() => (adjustmentSaving ? null : setAdjustmentOpen(null))}
        title={adjustmentOpen === 'earning' ? 'Add earning' : 'Add deduction'}
        description="Manual adjustments require a reason and are recorded separately from the calculated amounts."
        footer={
          <>
            <Button variant="secondary" size="sm" disabled={adjustmentSaving} onClick={() => setAdjustmentOpen(null)}>
              Cancel
            </Button>
            <Button size="sm" loading={adjustmentSaving} onClick={submitAdjustment}>
              Add adjustment
            </Button>
          </>
        }
      >
        <form className="space-y-4" onSubmit={submitAdjustment}>
          {adjustmentError && <Alert type="error">{adjustmentError}</Alert>}
          <Select
            label="Type"
            required
            value={adjustmentForm.type}
            onChange={(e) => setAdjustmentForm((f) => ({ ...f, type: e.target.value }))}
          >
            <option value="">Select type…</option>
            {(adjustmentOpen === 'earning' ? EARNING_TYPES : DEDUCTION_TYPES).map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
          <Input
            label="Amount"
            type="number"
            min="0.01"
            step="0.01"
            required
            value={adjustmentForm.amount}
            onChange={(e) => setAdjustmentForm((f) => ({ ...f, amount: e.target.value }))}
          />
          <Input
            label="Reason"
            required
            value={adjustmentForm.reason}
            onChange={(e) => setAdjustmentForm((f) => ({ ...f, reason: e.target.value }))}
            placeholder="Why this adjustment is being made"
          />
        </form>
      </Dialog>
    </div>
  );
}
