import { memo, useCallback, useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';
import { truncateChartLabel } from '../../../features/admin/utils/analyticsCharts';

const FILL = '#00AEEF';
const FILL_ACTIVE = '#0096d6';
const AXIS = '#cbd5e1';
const GRID = '#f1f5f9';
const TICK = '#94a3b8';
const LABEL = '#334155';
const PERCENT = '#0f172a';
const COUNT = '#64748b';
const CHART_FONT = "'Plus Jakarta Sans', system-ui, sans-serif";
const CHART_HEIGHT = 260;

function formatShare(share) {
  if (!Number.isFinite(share)) return '0%';
  return `${share % 1 === 0 ? share : share.toFixed(1)}%`;
}

function toTitleCase(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const upper = text.toUpperCase();
  if (upper === 'HR' || upper === 'IT') return upper;
  return text.toLowerCase().replace(/\b([a-z])/g, (match) => match.toUpperCase());
}

function userCountLabel(count) {
  return `${count} ${count === 1 ? 'user' : 'users'}`;
}

function niceHeadcountScale(peak) {
  const value = Math.max(1, Number(peak) || 1);
  const ceilings = [4, 6, 8, 10, 12, 16, 20, 24, 30, 40, 50, 60, 80, 100, 120, 160, 200];
  const max = ceilings.find((n) => n >= value) || Math.ceil(value / 50) * 50;
  const step = max <= 8 ? 2 : max <= 12 ? 4 : max <= 20 ? 5 : max / 4;
  const ticks = [];
  for (let tick = 0; tick <= max; tick += step) ticks.push(tick);
  return { domain: [0, max], ticks };
}

function BarTopBadge({ x, y, width, payload }) {
  if (x == null || y == null || !payload) return null;
  const cx = x + width / 2;
  return (
    <g>
      <text
        x={cx}
        y={y - 22}
        textAnchor="middle"
        fill={PERCENT}
        fontSize={13}
        fontWeight={700}
        fontFamily={CHART_FONT}
      >
        {formatShare(payload.share)}
      </text>
      <text
        x={cx}
        y={y - 8}
        textAnchor="middle"
        fill={COUNT}
        fontSize={11}
        fontWeight={500}
        fontFamily={CHART_FONT}
      >
        {userCountLabel(payload.value)}
      </text>
    </g>
  );
}

function CategoryTick({ x, y, payload }) {
  if (x == null || y == null) return null;
  return (
    <text
      x={x}
      y={y}
      dy={10}
      textAnchor="middle"
      fill={LABEL}
      fontSize={12}
      fontWeight={600}
      fontFamily={CHART_FONT}
    >
      {truncateChartLabel(payload?.value, 14)}
    </text>
  );
}

export const DepartmentBarChart = memo(function DepartmentBarChart({
  data,
  onDrillDown,
  enableDrillDown = true,
}) {
  const reduceMotion = useReducedMotion();
  const interactive = Boolean(enableDrillDown && onDrillDown);

  const rows = useMemo(() => {
    const ranked = [...(data || [])]
      .filter((row) => Number(row.total) > 0)
      .sort((a, b) => b.total - a.total || String(a.label).localeCompare(String(b.label)));
    const total = ranked.reduce((sum, row) => sum + (Number(row.total) || 0), 0);
    return ranked.map((row) => {
      const value = Number(row.total) || 0;
      const percentExact = total ? (value / total) * 100 : 0;
      return {
        ...row,
        value,
        share: Math.round(percentExact),
        percentExact,
        name: toTitleCase(row.label),
      };
    });
  }, [data]);

  const scale = useMemo(
    () => niceHeadcountScale(Math.max(...rows.map((row) => row.value), 0)),
    [rows],
  );

  const crowded = rows.length > 6;
  const innerWidth = rows.length * 80 + 56;

  const handleBarClick = useCallback(
    (item) => {
      const row = item?.payload || item;
      if (!interactive || !row?.drillDown) return;
      onDrillDown(row.drillDown);
    },
    [interactive, onDrillDown],
  );

  if (!rows.length) return null;

  return (
    <div
      className={`department-size-chart w-full bg-white ${crowded ? 'overflow-x-auto' : ''}`}
      data-lenis-prevent-horizontal={crowded || undefined}
    >
      <div
        style={{
          height: CHART_HEIGHT,
          minWidth: crowded ? innerWidth : undefined,
        }}
      >
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart
            data={rows}
            margin={{ top: 32, right: 24, left: 8, bottom: 8 }}
            barCategoryGap="20%"
            maxBarSize={60}
          >
            <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="3 3" />
            <XAxis
              dataKey="name"
              axisLine={{ stroke: AXIS, strokeWidth: 2 }}
              tickLine={false}
              interval={0}
              tick={<CategoryTick />}
            />
            <YAxis
              type="number"
              axisLine={{ stroke: AXIS, strokeWidth: 2 }}
              tickLine={false}
              tick={{ fill: TICK, fontSize: 11, fontWeight: 500, fontFamily: CHART_FONT }}
              ticks={scale.ticks}
              domain={scale.domain}
              width={28}
              allowDecimals={false}
            />
            <Bar
              dataKey="value"
              fill={FILL}
              radius={[4, 4, 0, 0]}
              barSize={52}
              cursor={interactive ? 'pointer' : 'default'}
              onClick={handleBarClick}
              activeBar={{ fill: FILL_ACTIVE }}
              isAnimationActive={!reduceMotion}
              animationDuration={800}
              animationEasing="ease-out"
            >
              <LabelList dataKey="value" content={BarTopBadge} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});
