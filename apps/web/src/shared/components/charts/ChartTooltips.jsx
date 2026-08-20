import { memo } from 'react';
import { motion } from 'framer-motion';
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

export const DepartmentDonutTooltipContent = memo(function DepartmentDonutTooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const count = Number(row.value ?? row.total) || 0;
  const pct = Number(row.percentExact ?? row.share);
  const pctLabel = Number.isFinite(pct) ? `${pct % 1 === 0 ? pct : pct.toFixed(1)}%` : '0%';

  return (
    <div className="min-w-[168px] space-y-2" role="tooltip">
      <p className="text-xs font-semibold text-[#0F172A]">{row.label}</p>
      <TooltipRow label="Headcount" value={count} accent={row.color} />
      <TooltipRow label="Share" value={pctLabel} />
    </div>
  );
});

export const AttendanceTooltipContent = memo(function AttendanceTooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const checkins = row.checkins ?? 0;
  const checkouts = row.checkouts ?? 0;

  return (
    <div
      className="min-w-[168px] rounded-2xl border border-slate-100 bg-white px-3 py-2.5 shadow-[0_10px_28px_rgba(15,23,42,0.12)]"
      role="tooltip"
    >
      <p className="text-[11px] font-semibold text-[#0F172A]">{label || row.label}</p>
      <div className="mt-2 space-y-1.5">
        <TooltipRow label="Check-ins" value={checkins} accent="#00AEEF" />
        <TooltipRow label="Check-outs" value={checkouts} accent="#38bdf8" />
      </div>
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
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-full border border-slate-100 bg-white px-2.5 py-1 text-xs font-bold text-slate-800 shadow-md"
      role="tooltip"
    >
      {label}
    </motion.div>
  );
});
