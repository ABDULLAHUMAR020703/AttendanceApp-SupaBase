import { memo } from 'react';
import {
  CartesianGrid,
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
  CHART_MARGINS,
  CHART_TOOLTIP_STYLE,
} from './chartTheme';
import { GrowthTooltipContent } from './ChartTooltips';

export const UserGrowthLineChart = memo(function UserGrowthLineChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <LineChart data={data} margin={CHART_MARGINS.line}>
        <CartesianGrid {...CHART_GRID} />
        <XAxis
          dataKey="label"
          tick={CHART_AXIS.tick}
          stroke={CHART_AXIS.stroke}
          minTickGap={16}
          label={{
            value: 'Month',
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
            value: 'New users',
            angle: -90,
            position: 'insideLeft',
            fill: CHART_AXIS.tick.fill,
            style: { textAnchor: 'middle', fontSize: 11 },
          }}
        />
        <Tooltip content={<GrowthTooltipContent />} wrapperStyle={CHART_TOOLTIP_STYLE} />
        <Line
          type="monotone"
          dataKey="users"
          name="New users"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          dot={{ r: 3, fill: CHART_COLORS.primary }}
          activeDot={{ r: 5 }}
          animationDuration={CHART_ANIMATION.duration}
          animationEasing={CHART_ANIMATION.easing}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});
