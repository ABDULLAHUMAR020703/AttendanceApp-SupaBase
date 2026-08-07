import { memo } from 'react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_COLORS } from './chartTheme';

const AXIS_TICK = { fill: '#64748B', fontSize: 11, fontWeight: 500 };

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[10rem] rounded-xl border border-hairline bg-white p-3 shadow-[0_8px_24px_-8px_rgba(0,151,167,0.18)]">
      <p className="text-[12px] font-semibold text-ink">{label}</p>
      <div className="mt-2 space-y-1.5">
        {payload.map((entry) => (
          <p key={entry.dataKey} className="flex items-center gap-2 text-caption text-ink-muted">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: entry.stroke }} aria-hidden />
            <span className="flex-1">{entry.name}</span>
            <span className="font-semibold tabular-nums text-ink">{entry.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export const AttendanceTrendAreaChart = memo(function AttendanceTrendAreaChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="trendCheckinsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.primary} stopOpacity={0.18} />
            <stop offset="100%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="trendHeadcountFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.tertiary} stopOpacity={0.1} />
            <stop offset="100%" stopColor={CHART_COLORS.tertiary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(0, 151, 167, 0.06)" strokeDasharray="3 8" vertical={false} />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          tickMargin={12}
          minTickGap={8}
          padding={{ left: 10, right: 10 }}
        />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          tickCount={4}
          allowDecimals={false}
          width={34}
        />
        <Tooltip
          content={<TrendTooltip />}
          cursor={{ stroke: 'rgba(0, 151, 167, 0.28)', strokeWidth: 1, strokeDasharray: '4 4' }}
        />
        <Area
          type="monotone"
          dataKey="headcount"
          name="Active headcount"
          stroke={CHART_COLORS.tertiary}
          strokeWidth={1.5}
          fill="url(#trendHeadcountFill)"
          fillOpacity={1}
          dot={false}
          animationDuration={750}
          animationEasing="ease-out"
          activeDot={{ r: 3.5, fill: CHART_COLORS.tertiary, stroke: '#ffffff', strokeWidth: 2 }}
        />
        <Area
          type="monotone"
          dataKey="checkins"
          name="Check-ins"
          stroke={CHART_COLORS.primary}
          strokeWidth={2}
          fill="url(#trendCheckinsFill)"
          fillOpacity={1}
          dot={false}
          animationDuration={800}
          animationEasing="ease-out"
          activeDot={{ r: 4, fill: CHART_COLORS.primary, stroke: '#ffffff', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
});
