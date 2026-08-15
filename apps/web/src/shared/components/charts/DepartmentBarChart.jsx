import { memo, useCallback } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CHART_ANIMATION,
  CHART_AXIS,
  CHART_COLORS,
  CHART_GRID,
  CHART_LEGEND_STYLE,
  CHART_MARGINS,
  CHART_TOOLTIP_STYLE,
} from './chartTheme';
import { DepartmentTooltipContent } from './ChartTooltips';
import { truncateChartLabel } from '../../../features/admin/utils/analyticsCharts';

export const DepartmentBarChart = memo(function DepartmentBarChart({
  data,
  onDrillDown,
  enableDrillDown = true,
}) {
  const handleBarClick = useCallback(
    (entry) => {
      if (!enableDrillDown || !onDrillDown || !entry?.drillDown) return;
      onDrillDown(entry.drillDown);
    },
    [enableDrillDown, onDrillDown]
  );

  const xAxisHeight = data.length > 4 ? 56 : 32;
  const xAxisAngle = data.length > 4 ? -24 : 0;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ ...CHART_MARGINS.bar, bottom: xAxisHeight > 32 ? 8 : CHART_MARGINS.bar.bottom }}>
        <CartesianGrid {...CHART_GRID} />
        <XAxis
          dataKey="label"
          tick={CHART_AXIS.tick}
          stroke={CHART_AXIS.stroke}
          interval={0}
          angle={xAxisAngle}
          textAnchor={xAxisAngle ? 'end' : 'middle'}
          height={xAxisHeight}
          tickFormatter={(value) => truncateChartLabel(value)}
        />
        <YAxis
          tick={CHART_AXIS.tick}
          stroke={CHART_AXIS.stroke}
          allowDecimals={false}
          label={{
            value: 'Users',
            angle: -90,
            position: 'insideLeft',
            fill: CHART_AXIS.tick.fill,
            style: { textAnchor: 'middle', fontSize: 11 },
          }}
        />
        <Tooltip
          content={<DepartmentTooltipContent />}
          cursor={{ fill: 'rgba(199, 239, 245, 0.35)' }}
          wrapperStyle={CHART_TOOLTIP_STYLE}
        />
        <Legend
          wrapperStyle={CHART_LEGEND_STYLE}
          formatter={(value) => (value === 'total' ? 'Total users' : 'Active users')}
        />
        <Bar
          dataKey="total"
          name="total"
          fill={CHART_COLORS.primary}
          radius={[6, 6, 0, 0]}
          animationDuration={CHART_ANIMATION.duration}
          animationEasing={CHART_ANIMATION.easing}
          onClick={handleBarClick}
          style={{ cursor: enableDrillDown && onDrillDown ? 'pointer' : 'default' }}
        />
        <Bar
          dataKey="active"
          name="active"
          fill={CHART_COLORS.secondary}
          radius={[6, 6, 0, 0]}
          animationDuration={CHART_ANIMATION.duration}
          animationEasing={CHART_ANIMATION.easing}
          onClick={handleBarClick}
          style={{ cursor: enableDrillDown && onDrillDown ? 'pointer' : 'default' }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
});
