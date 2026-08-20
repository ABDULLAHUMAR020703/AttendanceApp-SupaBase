/**
 * Shared analytics filter state and derived metrics.
 * Designed for future drill-down: pass drillDownTarget to narrow child views.
 *
 * @typedef {import('../utils/analyticsCharts').DrillDownTarget} DrillDownTarget
 */

import { useMemo } from 'react';
import {
  buildAttendanceSeries,
  buildDepartmentChartData,
  computeAnalyticsKpis,
  getRangeDayCount,
  resolveDateRange,
} from '../../../features/admin/utils/analyticsCharts';
import { withAttendanceActivityFallback } from '../../../features/admin/utils/analyticsActivityMock';

export function useAnalyticsMetrics({
  datePreset,
  customFrom,
  customTo,
  attendanceRecords,
  users,
  distribution,
}) {
  const selectedRange = useMemo(
    () => resolveDateRange(datePreset, customFrom, customTo),
    [datePreset, customFrom, customTo]
  );

  const rangeInvalid = datePreset === 'custom' && !selectedRange;

  const departmentChartData = useMemo(
    () => buildDepartmentChartData(distribution),
    [distribution]
  );

  const attendanceSeries = useMemo(() => {
    if (!selectedRange || rangeInvalid) return { data: [], granularity: 'daily' };
    const built = buildAttendanceSeries(attendanceRecords, selectedRange);
    return withAttendanceActivityFallback(built, getRangeDayCount(selectedRange));
  }, [attendanceRecords, selectedRange, rangeInvalid]);

  const kpis = useMemo(() => {
    if (!selectedRange || rangeInvalid) {
      return computeAnalyticsKpis({
        attendanceRecords: [],
        users,
        distribution,
        range: null,
      });
    }
    return computeAnalyticsKpis({
      attendanceRecords,
      users,
      distribution,
      range: selectedRange,
    });
  }, [attendanceRecords, users, distribution, selectedRange, rangeInvalid]);

  return {
    selectedRange,
    rangeInvalid,
    departmentChartData,
    attendanceSeries,
    kpis,
  };
}
