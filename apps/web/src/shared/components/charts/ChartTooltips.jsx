import { memo } from 'react';
import { CHART_COLORS } from './chartTheme';

function TooltipRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="flex items-center gap-2 text-ink-muted">
        {accent && <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />}
        {label}
      </span>
      <span className="font-semibold tabular-nums text-[#0F172A]">{value}</span>
    </div>
  );
}

export const DepartmentTooltipContent = memo(function DepartmentTooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="min-w-[180px] space-y-2" role="tooltip">
      <p className="text-xs font-semibold text-[#0F172A]">{row.label}</p>
      <TooltipRow label="Total users" value={row.total} accent={CHART_COLORS.primary} />
      <TooltipRow label="Active users" value={row.active} accent={CHART_COLORS.secondary} />
      <TooltipRow label="Active rate" value={`${row.activePct ?? 0}%`} />
    </div>
  );
});

export const AttendanceTooltipContent = memo(function AttendanceTooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const checkins = row.checkins ?? 0;
  const checkouts = row.checkouts ?? 0;
  const total = row.events ?? checkins + checkouts;

  return (
    <div className="min-w-[180px] space-y-2" role="tooltip">
      <p className="text-xs font-semibold text-[#0F172A]">{label || row.label}</p>
      <TooltipRow label="Check-ins" value={checkins} accent={CHART_COLORS.primary} />
      <TooltipRow label="Check-outs" value={checkouts} accent={CHART_COLORS.secondary} />
      <TooltipRow label="Total events" value={total} />
    </div>
  );
});

export const GrowthTooltipContent = memo(function GrowthTooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload.find((entry) => entry.dataKey === 'users') || payload[0];
  const n = Number(item?.value);
  if (!Number.isFinite(n)) return null;
  const label =
    n >= 1000
      ? `${Number((n / 1000).toFixed(n >= 10000 ? 0 : 1))}k`
      : Number.isInteger(n)
        ? String(n)
        : n.toFixed(1);

  return (
    <div
      className="rounded-md border border-slate-100 bg-white/90 px-2 py-0.5 text-xs font-bold text-slate-800 shadow-sm backdrop-blur-sm"
      role="tooltip"
    >
      {label}
    </div>
  );
});
