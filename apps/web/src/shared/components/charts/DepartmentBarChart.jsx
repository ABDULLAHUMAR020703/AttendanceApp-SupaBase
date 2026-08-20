import { memo, useCallback } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
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
  CHART_HEIGHT,
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
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart
        data={data}
        barCategoryGap={data.length > 5 ? '18%' : '26%'}
        barGap={4}
        margin={{ top: 22, right: 12, left: 0, bottom: xAxisHeight > 32 ? 8 : 20 }}
      >
        <CartesianGrid {...CHART_GRID} horizontal vertical={false} />
        <XAxis
          dataKey="label"
          tick={CHART_AXIS.tick}
          axisLine={{ stroke: CHART_AXIS.stroke }}
          tickLine={false}
          stroke={CHART_AXIS.stroke}
          interval={0}
          angle={xAxisAngle}
          textAnchor={xAxisAngle ? 'end' : 'middle'}
          height={xAxisHeight}
          tickFormatter={(value) => truncateChartLabel(value)}
        />
        <YAxis
          tick={CHART_AXIS.tick}
          axisLine={false}
          tickLine={false}
          stroke={CHART_AXIS.stroke}
          allowDecimals={false}
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
          radius={[5, 5, 0, 0]}
          maxBarSize={28}
          animationDuration={CHART_ANIMATION.duration}
          animationEasing={CHART_ANIMATION.easing}
          onClick={handleBarClick}
          style={{ cursor: enableDrillDown && onDrillDown ? 'pointer' : 'default' }}
        >
          <LabelList
            dataKey="total"
            position="top"
            offset={8}
            fill="#0F172A"
            fontSize={11}
            fontWeight={700}
          />
        </Bar>
        <Bar
          dataKey="active"
          name="active"
          fill={CHART_COLORS.secondary}
          radius={[5, 5, 0, 0]}
          maxBarSize={28}
          animationDuration={CHART_ANIMATION.duration}
          animationEasing={CHART_ANIMATION.easing}
          onClick={handleBarClick}
          style={{ cursor: enableDrillDown && onDrillDown ? 'pointer' : 'default' }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
});
