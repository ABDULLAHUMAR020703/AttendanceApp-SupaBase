import { memo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CHART_ANIMATION,
  CHART_AXIS,
  CHART_COLORS,
  CHART_MARGINS,
  CHART_TOOLTIP_STYLE,
} from './chartTheme';
import { GrowthTooltipContent } from './ChartTooltips';

export const UserGrowthLineChart = memo(function UserGrowthLineChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ ...CHART_MARGINS.line, top: 6, right: 18, left: 0, bottom: 4 }}>
        <defs>
          <linearGradient id="userGrowthCyanArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.22} />
            <stop offset="55%" stopColor={CHART_COLORS.primary} stopOpacity={0.1} />
            <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(27, 36, 48, 0.06)" strokeDasharray="4 6" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ ...CHART_AXIS.tick, fill: CHART_COLORS.tick, fontSize: 11, fontWeight: 500 }}
          stroke={CHART_COLORS.axis}
          axisLine={false}
          tickLine={false}
          minTickGap={16}
        />
        <YAxis
          tick={{ ...CHART_AXIS.tick, fill: CHART_COLORS.tick, fontSize: 11, fontWeight: 500 }}
          stroke={CHART_COLORS.axis}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<GrowthTooltipContent />} wrapperStyle={CHART_TOOLTIP_STYLE} />
        <Area
          type="monotone"
          dataKey="users"
          name="New users"
          stroke={CHART_COLORS.primary}
          strokeWidth={3}
          fill="url(#userGrowthCyanArea)"
          fillOpacity={1}
          dot={{ r: 3, fill: '#FFFFFF', stroke: CHART_COLORS.primary, strokeWidth: 2 }}
          activeDot={{ r: 5, fill: CHART_COLORS.primary, stroke: '#FFFFFF', strokeWidth: 2 }}
          animationDuration={CHART_ANIMATION.duration}
          animationEasing={CHART_ANIMATION.easing}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});
