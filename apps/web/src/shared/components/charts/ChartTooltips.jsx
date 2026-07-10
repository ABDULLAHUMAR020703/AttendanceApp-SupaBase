import { memo } from 'react';

function TooltipRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between gap-4 text-xs">
      <span className="flex items-center gap-2 text-slate-300">
        {accent && <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />}
        {label}
      </span>
      <span className="font-medium tabular-nums text-slate-50">{value}</span>
    </div>
  );
}

export const DepartmentTooltipContent = memo(function DepartmentTooltipContent({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="min-w-[180px] space-y-2" role="tooltip">
      <p className="text-xs font-semibold text-white">{row.label}</p>
      <TooltipRow label="Total users" value={row.total} accent="#3B82F6" />
      <TooltipRow label="Active users" value={row.active} accent="#10B981" />
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
      <p className="text-xs font-semibold text-white">{label || row.label}</p>
      <TooltipRow label="Check-ins" value={checkins} accent="#3B82F6" />
      <TooltipRow label="Check-outs" value={checkouts} accent="#10B981" />
      <TooltipRow label="Total events" value={total} />
    </div>
  );
});

export const GrowthTooltipContent = memo(function GrowthTooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  return (
    <div className="min-w-[160px] space-y-2" role="tooltip">
      <p className="text-xs font-semibold text-white">{label || row.label}</p>
      <TooltipRow label="New registrations" value={`${row.users} users`} accent="#3B82F6" />
    </div>
  );
});
