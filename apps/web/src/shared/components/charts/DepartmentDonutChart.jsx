import { memo, useCallback, useMemo, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from 'recharts';
import { CHART_ANIMATION, CHART_TOOLTIP_STYLE, DEPARTMENT_DONUT_COLORS } from './chartTheme';
import { DepartmentDonutTooltipContent } from './ChartTooltips';

function pluralizeUsers(count) {
  return `${count} ${count === 1 ? 'user' : 'users'}`;
}

function formatShare(pct) {
  if (!Number.isFinite(pct)) return '0%';
  return `${pct % 1 === 0 ? pct : pct.toFixed(1)}%`;
}

export const DepartmentDonutChart = memo(function DepartmentDonutChart({
  data,
  onDrillDown,
  enableDrillDown = true,
}) {
  const [activeIndex, setActiveIndex] = useState(null);

  const slices = useMemo(() => {
    const ranked = [...(data || [])]
      .filter((row) => Number(row.total) > 0)
      .sort((a, b) => b.total - a.total || String(a.label).localeCompare(String(b.label)));
    const total = ranked.reduce((sum, row) => sum + (Number(row.total) || 0), 0);

    return ranked.map((row, index) => {
      const value = Number(row.total) || 0;
      const percentExact = total ? (value / total) * 100 : 0;
      return {
        ...row,
        value,
        share: Math.round(percentExact),
        percentExact,
        color: DEPARTMENT_DONUT_COLORS[index] || DEPARTMENT_DONUT_COLORS[DEPARTMENT_DONUT_COLORS.length - 1],
      };
    });
  }, [data]);

  const totalUsers = useMemo(
    () => slices.reduce((sum, row) => sum + row.value, 0),
    [slices]
  );

  const handleSliceClick = useCallback(
    (entry) => {
      const target = entry?.payload || entry;
      if (!enableDrillDown || !onDrillDown || !target?.drillDown) return;
      onDrillDown(target.drillDown);
    },
    [enableDrillDown, onDrillDown]
  );

  const renderSlice = useCallback(
    (props) => {
      const hovered = props.isActive || props.index === activeIndex;
      return (
        <Sector
          cx={props.cx}
          cy={props.cy}
          innerRadius={props.innerRadius}
          outerRadius={(props.outerRadius || 0) + (hovered ? 3 : 0)}
          startAngle={props.startAngle}
          endAngle={props.endAngle}
          fill={props.fill}
          fillOpacity={activeIndex == null || hovered ? 1 : 0.42}
          cornerRadius={props.cornerRadius || 8}
          stroke="none"
          style={{ outline: 'none' }}
        />
      );
    },
    [activeIndex]
  );

  const interactive = Boolean(enableDrillDown && onDrillDown);
  const summary = slices
    .map((row) => `${row.label} ${row.value} (${formatShare(row.percentExact)})`)
    .join(', ');

  return (
    <div
      className="flex h-full w-full min-w-0 flex-col items-stretch gap-5 sm:flex-row sm:items-center sm:gap-6"
      onMouseLeave={() => setActiveIndex(null)}
    >
      <div className="relative mx-auto aspect-square h-[13.5rem] w-[13.5rem] shrink-0 sm:mx-0 sm:h-[15rem] sm:w-[15rem]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius="65%"
              outerRadius="85%"
              paddingAngle={slices.length > 1 ? 3 : 0}
              cornerRadius={8}
              stroke="none"
              legendType="none"
              isAnimationActive="auto"
              animationDuration={CHART_ANIMATION.duration}
              animationEasing={CHART_ANIMATION.easing}
              shape={renderSlice}
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onClick={handleSliceClick}
              style={{ cursor: interactive ? 'pointer' : 'default', outline: 'none' }}
            >
              {slices.map((row) => (
                <Cell key={row.id ?? row.label} fill={row.color} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              content={<DepartmentDonutTooltipContent />}
              wrapperStyle={CHART_TOOLTIP_STYLE}
              allowEscapeViewBox={{ x: true, y: true }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="text-[1.85rem] font-bold leading-none tabular-nums text-slate-900 sm:text-4xl">
            {totalUsers}
          </p>
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Total users
          </p>
        </div>
      </div>

      <ul className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-1.5 overflow-y-auto">
        {slices.map((row, index) => {
          const hovered = activeIndex === index;
          const dimmed = activeIndex != null && !hovered;
          return (
            <li key={row.id ?? row.label}>
              <button
                type="button"
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onClick={() => handleSliceClick(row)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-opacity duration-200 hover:bg-white/70"
                style={{
                  opacity: dimmed ? 0.4 : 1,
                  cursor: interactive ? 'pointer' : 'default',
                }}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: row.color }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-700">
                    {row.label}
                  </span>
                  <span className="mt-0.5 block text-xs tabular-nums text-slate-500">
                    {pluralizeUsers(row.value)} • {formatShare(row.percentExact)}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <span className="sr-only">{`Total users ${totalUsers}. ${summary}`}</span>
    </div>
  );
});
