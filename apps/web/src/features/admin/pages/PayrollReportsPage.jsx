import { useCallback, useEffect, useState } from 'react';
import { FileBarChart } from 'lucide-react';
import { payrollService } from '../services/payrollService';
import { Alert } from '../../../shared/components/ui/Alert';
import { Select } from '../../../shared/components/ui/Select';
import { EmptyStateBody } from '../../../shared/components/ui/EmptyState';
import { KpiMetricCard, KpiMetricGrid } from '../../../shared/components/ui/KpiMetricCard';
import { GlassTable, TableCell, TableRow } from '../../../shared/components/GlassTable';
import { PageActions } from '../../../shared/components/pageChrome';
import { formatCurrency, formatDateRange } from '../../../shared/lib/format';

export function PayrollReportsPage() {
  const [periods, setPeriods] = useState([]);
  const [periodId, setPeriodId] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    payrollService
      .getPeriods()
      .then((data) => {
        setPeriods(data || []);
        const calculated = (data || []).find((p) => p.status !== 'draft') || data?.[0];
        if (calculated) setPeriodId(calculated.id);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const loadReport = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await payrollService.getSummaryReport(id);
      setReport(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (periodId) loadReport(periodId);
  }, [periodId, loadReport]);

  // payroll_periods has no currency column (currency lives on salary profiles /
  // records) — V1 assumes one currency per company, so this just uses the
  // formatter's default when nothing more specific is available.
  const currency = report?.departments?.[0]?.currency;

  return (
    <div className="payroll-reports admin-page gap-4 animate-fade-up">
      <PageActions>
        <Select value={periodId} onChange={(e) => setPeriodId(e.target.value)} size="sm" className="w-auto min-w-[12rem]" aria-label="Payroll period">
          {periods.map((p) => (
            <option key={p.id} value={p.id}>
              {formatDateRange(p.period_start, p.period_end)}
            </option>
          ))}
        </Select>
      </PageActions>

      {error && <Alert type="error">{error}</Alert>}

      {!loading && periods.length === 0 ? (
        <EmptyStateBody
          icon={FileBarChart}
          title="No payroll periods to report on"
          description="Create and calculate a payroll period first."
          className="py-16"
        />
      ) : (
        <>
          <KpiMetricGrid columns={5}>
            <KpiMetricCard label="Employees" value={loading ? '—' : report?.summary?.employees ?? 0} loading={loading} />
            <KpiMetricCard label="Gross payroll" value={loading ? '—' : formatCurrency(report?.summary?.gross, currency)} loading={loading} />
            <KpiMetricCard label="Deductions" value={loading ? '—' : formatCurrency(report?.summary?.deductions, currency)} loading={loading} />
            <KpiMetricCard label="Tax" value={loading ? '—' : formatCurrency(report?.summary?.tax, currency)} loading={loading} />
            <KpiMetricCard label="Net payroll" value={loading ? '—' : formatCurrency(report?.summary?.net, currency)} loading={loading} />
          </KpiMetricGrid>

          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-800">Department summary</p>
            </div>
            <GlassTable
              className="rounded-none border-0 shadow-none"
              loading={loading}
              skeletonRows={4}
              emptyTitle="No departments"
              emptyMessage="No payroll records for this period yet."
              columns={[
                { key: 'department', label: 'Department' },
                { key: 'employees', label: 'Employees' },
                { key: 'gross', label: 'Gross' },
                { key: 'deductions', label: 'Deductions' },
                { key: 'net', label: 'Net' },
              ]}
            >
              {(report?.departments || []).map((row) => (
                <TableRow key={row.department_id || 'unassigned'}>
                  <TableCell className="text-sm font-medium text-slate-800">{row.department_name}</TableCell>
                  <TableCell className="text-sm tabular-nums text-slate-600">{row.employees}</TableCell>
                  <TableCell className="text-sm tabular-nums text-slate-600">{formatCurrency(row.gross, currency)}</TableCell>
                  <TableCell className="text-sm tabular-nums text-slate-500">{formatCurrency(row.deductions, currency)}</TableCell>
                  <TableCell className="text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(row.net, currency)}</TableCell>
                </TableRow>
              ))}
            </GlassTable>
          </div>
        </>
      )}
    </div>
  );
}
