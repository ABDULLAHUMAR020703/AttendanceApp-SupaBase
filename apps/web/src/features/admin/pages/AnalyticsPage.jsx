import { lazy, Suspense, useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../../../shared/components/GlassCard';
import {
  AnalyticsKpiGrid,
  ChartPanel,
  ChartSkeleton,
  DateRangeSelector,
} from '../../../shared/components/charts';
import { useAnalyticsMetrics } from '../../../shared/components/charts/useAnalyticsMetrics';
import { Skeleton, SkeletonGroup } from '../../../shared/components/ui/Skeleton';
import { adminService } from '../services/adminService';
import { formatRangeLabel, getAggregationLabel, hasSeriesData } from '../utils/analyticsCharts';
import { PageActions } from '../../../shared/components/pageChrome';

const DepartmentBarChart = lazy(() =>
  import('../../../shared/components/charts/DepartmentBarChart').then((m) => ({
    default: m.DepartmentBarChart,
  }))
);
const AttendanceLineChart = lazy(() =>
  import('../../../shared/components/charts/AttendanceLineChart').then((m) => ({
    default: m.AttendanceLineChart,
  }))
);

function buildDistributionFromUsers(users, departments) {
  const deptByKey = new Map();
  for (const d of departments || []) {
    const name = d.name || d.id;
    deptByKey.set(String(name).toLowerCase().replace(/\s+/g, ' '), {
      id: d.id,
      name,
      employeeCount: 0,
      activeCount: 0,
    });
  }

  let unassigned = 0;
  for (const user of users || []) {
    const deptName = user.department?.trim();
    if (!deptName) {
      unassigned += 1;
      continue;
    }
    const key = deptName.toLowerCase().replace(/\s+/g, ' ');
    if (!deptByKey.has(key)) {
      deptByKey.set(key, { id: key, name: deptName, employeeCount: 0, activeCount: 0 });
    }
    const bucket = deptByKey.get(key);
    bucket.employeeCount += 1;
    if (user.is_active) bucket.activeCount += 1;
  }

  const rows = Array.from(deptByKey.values()).filter((d) => d.employeeCount > 0);
  rows.sort((a, b) => b.employeeCount - a.employeeCount);
  if (unassigned > 0) {
    rows.push({ id: 'unassigned', name: 'Unassigned', employeeCount: unassigned, activeCount: unassigned });
  }
  return rows;
}

function ChartSuspense({ children }) {
  return (
    <div className="h-full min-h-0 w-full">
      <Suspense fallback={<ChartSkeleton />}>{children}</Suspense>
    </div>
  );
}

export function AnalyticsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [distribution, setDistribution] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [users, setUsers] = useState([]);
  const [datePreset, setDatePreset] = useState('last_30d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [isPending, startTransition] = useTransition();

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const [analytics, usersData, attendanceData, deptOverview] = await Promise.all([
        adminService.getAnalytics().catch(() => null),
        adminService.getUsers(),
        adminService.getAttendance(),
        adminService.getDepartmentsOverview(),
      ]);

      const userRows = usersData || [];
      setUsers(userRows);
      setAttendanceRecords(attendanceData || []);

      if (analytics?.departmentDistribution?.length) {
        setDistribution(analytics.departmentDistribution);
      } else {
        const deptRows = buildDistributionFromUsers(userRows, deptOverview);

        if (deptRows.length === 0 && (deptOverview || []).length > 0) {
          const maxFromOverview = Math.max(...deptOverview.map((d) => d.employeeCount || 0), 0);
          if (maxFromOverview > 0) {
            setDistribution(
              deptOverview
                .filter((d) => (d.employeeCount || 0) > 0)
                .map((d) => ({
                  id: d.id,
                  name: d.name,
                  employeeCount: d.employeeCount || 0,
                  activeCount: d.employeeCount || 0,
                }))
            );
          } else {
            setDistribution(deptRows);
          }
        } else {
          setDistribution(deptRows);
        }
      }
    } catch (err) {
      setError(err?.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const { selectedRange, rangeInvalid, departmentChartData, attendanceSeries, kpis } =
    useAnalyticsMetrics({
      datePreset,
      customFrom,
      customTo,
      attendanceRecords,
      users,
      distribution,
    });

  const recalculating = isPending && !loading;

  const hasDepartmentData = hasSeriesData(departmentChartData, ['total', 'active']);
  const hasAttendanceData = hasSeriesData(attendanceSeries.data, ['checkins', 'checkouts', 'events']);

  const handlePresetChange = useCallback((value) => {
    startTransition(() => setDatePreset(value));
  }, []);

  const handleCustomFromChange = useCallback((value) => {
    startTransition(() => setCustomFrom(value));
  }, []);

  const handleCustomToChange = useCallback((value) => {
    startTransition(() => setCustomTo(value));
  }, []);

  const handleDrillDown = useCallback(
    (target) => {
      if (target?.type === 'department' && target.id !== 'unassigned') {
        navigate('/users', { state: { departmentFilter: target.label } });
      }
    },
    [navigate]
  );

  const suggestWiderRange = useCallback(() => {
    startTransition(() => setDatePreset('last_90d'));
  }, []);

  const suggestThisMonth = useCallback(() => {
    startTransition(() => setDatePreset('this_month'));
  }, []);

  const kpiItems = useMemo(
    () => [
      {
        id: 'attendance-events',
        label: 'Attendance events',
        value: kpis.attendanceEvents,
        hint: selectedRange ? formatRangeLabel(selectedRange.start, selectedRange.end) : 'Select a range',
      },
      { id: 'checkins', label: 'Check-ins', value: kpis.checkins, hint: 'In selected period' },
      { id: 'checkouts', label: 'Check-outs', value: kpis.checkouts, hint: 'In selected period' },
      {
        id: 'unique-attendees',
        label: 'Unique attendees',
        value: kpis.uniqueAttendees,
        hint: 'Users with activity in range',
      },
      {
        id: 'new-registrations',
        label: 'New registrations',
        value: kpis.newRegistrations,
        hint: 'Users created in range',
      },
      {
        id: 'avg-events',
        label: 'Avg events / attendee',
        value: kpis.avgEventsPerAttendee.toFixed(2),
        hint: 'Per unique attendee',
      },
    ],
    [kpis, selectedRange]
  );

  const insightRows = selectedRange && !rangeInvalid
    ? [
        { label: 'Total accounts', value: kpis.totalUsers },
        { label: 'Active accounts (current)', value: kpis.activeAccounts },
        { label: 'Tracked departments', value: kpis.trackedDepartments },
        ...(kpis.unassignedUsers > 0
          ? [{ label: 'Users without department', value: kpis.unassignedUsers }]
          : []),
      ]
    : [];

  const attendanceSubtitle = selectedRange
    ? `${getAggregationLabel(attendanceSeries.granularity)} check-in and check-out events · ${formatRangeLabel(selectedRange.start, selectedRange.end)}`
    : 'Check-in and check-out events per period';

  return (
    <div className="analytics-page admin-page gap-4 animate-fade-up print:overflow-visible print:text-slate-900">
      <PageActions>
        <DateRangeSelector
          compact
          preset={datePreset}
          customFrom={customFrom}
          customTo={customTo}
          selectedRange={selectedRange}
          rangeInvalid={rangeInvalid}
          onPresetChange={handlePresetChange}
          onCustomFromChange={handleCustomFromChange}
          onCustomToChange={handleCustomToChange}
        />
        <button type="button" onClick={() => window.print()} className="ui-btn-secondary ui-btn-sm print:hidden">
          Export
        </button>
      </PageActions>

      {error && (
        <GlassCard className="p-4" role="alert">
          <p className="text-sm text-danger-ink">{error}</p>
        </GlassCard>
      )}

      <AnalyticsKpiGrid items={kpiItems} loading={loading || recalculating} className="shrink-0 print:grid-cols-3" />

      <div className="grid gap-4 xl:grid-cols-2">
        <GlassCard hover={false} className="flex min-h-[22rem] flex-col p-5">
          <ChartPanel
            exportId="chart-department-distribution"
            title="Department Size Distribution"
            subtitle="Current headcount snapshot by department (not filtered by date)"
            loading={loading}
            recalculating={recalculating}
            isEmpty={!hasDepartmentData}
            surfaceClassName="border-0 bg-white"
            emptyState={{
              title: 'No department data yet',
              description:
                'Users have not been assigned to departments. Assign departments on the Users page to populate this chart.',
              actions: [{ label: 'Manage users', onClick: () => navigate('/users') }],
            }}
          >
            <ChartSuspense>
              <DepartmentBarChart
                data={departmentChartData}
                onDrillDown={handleDrillDown}
                enableDrillDown
              />
            </ChartSuspense>
          </ChartPanel>
        </GlassCard>

        <GlassCard hover={false} className="flex min-h-[22rem] flex-col p-5">
          <ChartPanel
            exportId="chart-attendance-activity"
            title="Attendance Activity"
            subtitle={attendanceSubtitle}
            loading={loading}
            recalculating={recalculating}
            isEmpty={rangeInvalid || !hasAttendanceData}
            surfaceClassName="border-0 bg-white"
            flush={!rangeInvalid && hasAttendanceData}
            emptyState={
              rangeInvalid
                ? {
                    title: 'Select a valid date range',
                    description:
                      'Choose both a start and end date, or switch to a preset such as Last 30 Days.',
                    actions: [{ label: 'Use Last 30 Days', onClick: () => handlePresetChange('last_30d') }],
                  }
                : {
                    title: 'No attendance activity in this period',
                    description:
                      'There are no check-in or check-out records for the selected range. Try expanding the period or verify attendance is being recorded.',
                    actions: [
                      { label: 'Try Last 90 Days', onClick: suggestWiderRange },
                      { label: 'Try This Month', onClick: suggestThisMonth },
                    ],
                  }
            }
          >
            <ChartSuspense>
              <AttendanceLineChart
                data={attendanceSeries.data}
                granularity={attendanceSeries.granularity}
              />
            </ChartSuspense>
          </ChartPanel>
        </GlassCard>
      </div>

      <GlassCard hover={false} className="p-5">
        <h2 className="card-title mb-1">Organization insights</h2>
        <p className="mb-4 text-xs text-ink-muted">
          Account and structure metrics alongside your filtered attendance period
        </p>
        {/* Two columns per row, matching the label/value pairs that replace them. */}
        {loading && (
          <SkeletonGroup label="Loading insights" className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-4 border-b border-hairline-soft pb-2.5 last:border-0">
                <Skeleton className="h-3.5 w-40 max-w-[55%]" />
                <Skeleton className="h-3.5 w-12" />
              </div>
            ))}
          </SkeletonGroup>
        )}
        {!loading && insightRows.length > 0 && (
          <ul className="space-y-3 text-sm text-ink">
            {insightRows.map((row) => (
              <li
                key={row.label}
                className="flex items-center justify-between gap-4 border-b border-hairline pb-2 last:border-0"
              >
                <span className="text-ink-muted">{row.label}</span>
                <span className="font-semibold tabular-nums text-ink">{row.value}</span>
              </li>
            ))}
          </ul>
        )}
        {!loading && !insightRows.length && (
          <p className="text-sm text-ink-muted">Select a valid date range to view insights.</p>
        )}
      </GlassCard>
    </div>
  );
}
