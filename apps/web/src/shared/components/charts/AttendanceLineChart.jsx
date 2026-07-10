import { memo } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
import { AttendanceTooltipContent } from './ChartTooltips';

export const AttendanceLineChart = memo(function AttendanceLineChart({
  data,
  granularity = 'daily',
}) {
  const xLabel = granularity === 'monthly' ? 'Month' : granularity === 'weekly' ? 'Week' : 'Date';

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <LineChart data={data} margin={CHART_MARGINS.line}>
        <CartesianGrid {...CHART_GRID} />
        <XAxis
          dataKey="label"
          tick={CHART_AXIS.tick}
          stroke={CHART_AXIS.stroke}
          minTickGap={granularity === 'daily' ? 20 : 12}
          label={{
            value: xLabel,
            position: 'insideBottom',
            offset: -2,
            fill: CHART_AXIS.tick.fill,
            style: { fontSize: 11 },
          }}
        />
        <YAxis
          tick={CHART_AXIS.tick}
          stroke={CHART_AXIS.stroke}
          allowDecimals={false}
          label={{
            value: 'Events',
            angle: -90,
            position: 'insideLeft',
            fill: CHART_AXIS.tick.fill,
            style: { textAnchor: 'middle', fontSize: 11 },
          }}
        />
        <Tooltip
          content={<AttendanceTooltipContent />}
          wrapperStyle={CHART_TOOLTIP_STYLE}
        />
        <Legend
          wrapperStyle={CHART_LEGEND_STYLE}
          formatter={(value) => (value === 'checkins' ? 'Check-ins' : 'Check-outs')}
        />
        <Line
          type="monotone"
          dataKey="checkins"
          name="checkins"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          dot={data.length <= 31 ? { r: 3 } : false}
          activeDot={{ r: 5 }}
          animationDuration={CHART_ANIMATION.duration}
          animationEasing={CHART_ANIMATION.easing}
        />
        <Line
          type="monotone"
          dataKey="checkouts"
          name="checkouts"
          stroke={CHART_COLORS.secondary}
          strokeWidth={2}
          dot={data.length <= 31 ? { r: 3 } : false}
          activeDot={{ r: 5 }}
          animationDuration={CHART_ANIMATION.duration}
          animationEasing={CHART_ANIMATION.easing}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});
