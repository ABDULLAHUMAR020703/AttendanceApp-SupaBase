import { memo } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const AXIS_TICK = {
  fill: '#8898AA',
  fontSize: 11,
  fontWeight: 500,
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
};

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="min-w-[9.5rem] rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-[0_8px_20px_-10px_rgba(15,23,42,0.18)]">
      <p className="text-xs font-semibold text-slate-900">{label}</p>
      <div className="mt-2 space-y-1">
        {payload.map((entry) => (
          <p key={entry.dataKey} className="flex items-center justify-between gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden />
              {entry.name}
            </span>
            <span className="font-semibold tabular-nums text-slate-900">{entry.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

export const AttendanceTrendAreaChart = memo(function AttendanceTrendAreaChart({ data }) {
  const hasPrevious = (data || []).some((row) => row.previous != null);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="#E8EEF2" strokeDasharray="0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          tickMargin={10}
          minTickGap={12}
        />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          tickMargin={8}
          tickCount={4}
          allowDecimals={false}
          width={32}
        />
        <Tooltip content={<TrendTooltip />} cursor={{ stroke: '#C5D4DE', strokeWidth: 1 }} />
        {hasPrevious && (
          <Line
            type="monotone"
            dataKey="previous"
            name="Prior period"
            stroke="#C2ECF9"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            animationDuration={480}
            animationEasing="ease-out"
          />
        )}
        <Line
          type="monotone"
          dataKey="checkins"
          name="Check-ins"
          stroke="#00B0FF"
          strokeWidth={2}
          dot={false}
          animationDuration={520}
          animationEasing="ease-out"
          activeDot={{ r: 4, fill: '#00B0FF', stroke: '#ffffff', strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
});
