import { memo } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

export const AttendanceMixPieChart = memo(function AttendanceMixPieChart({
  data,
  centerLabel,
  centerHint,
}) {
  const rows = (data || []).filter((row) => Number(row.value) > 0);
  const fallback = rows.length ? rows : [{ name: 'None', value: 1, color: '#E8F3F8' }];
  const summary = (data || [])
    .map((row) => `${row.name} ${row.value}${row.share != null ? ` (${row.share}%)` : ''}`)
    .join(', ');

  return (
    <div className="relative h-full min-h-0 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={fallback}
            dataKey="value"
            nameKey="name"
            innerRadius="68%"
            outerRadius="92%"
            paddingAngle={rows.length > 1 ? 2 : 0}
            stroke="#FFFFFF"
            strokeWidth={2}
            animationDuration={520}
            animationEasing="ease-out"
          >
            {fallback.map((row) => (
              <Cell key={row.name} fill={row.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerHint) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerLabel && (
            <span className="text-lg font-semibold tabular-nums tracking-tight text-slate-900">{centerLabel}</span>
          )}
          {centerHint && <span className="text-[11px] font-medium text-slate-400">{centerHint}</span>}
        </div>
      )}
      <span className="sr-only">{[centerLabel, centerHint, summary].filter(Boolean).join('. ')}</span>
    </div>
  );
});
