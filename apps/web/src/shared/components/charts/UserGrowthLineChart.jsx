import { memo, useMemo } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_ANIMATION } from './chartTheme';
import { GrowthTooltipContent } from './ChartTooltips';

const PRIMARY = '#00A3FF';
const SECONDARY = '#1E293B';
const AXIS = '#94A3B8';
const GRID = '#E2E8F0';
const TICK = {
  fill: AXIS,
  fontSize: 10,
  fontWeight: 500,
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
};

export function formatCompactCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return '0';
  if (n >= 1000) {
    const k = n / 1000;
    const body = k >= 10 || Number.isInteger(k) ? String(Math.round(k)) : String(Number(k.toFixed(1)));
    return `${body}K`;
  }
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function formatAxisValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  if (n >= 1000) {
    const k = n / 1000;
    const body = k >= 10 || Number.isInteger(k) ? String(Math.round(k)) : String(Number(k.toFixed(1)));
    return `${body}k`;
  }
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function EndBadge({ cx, cy, value, fill }) {
  if (cx == null || cy == null || value == null) return null;
  const text = formatCompactCount(value);
  const width = Math.max(34, text.length * 7.2 + 14);
  const height = 18;
  const x = cx + 8;
  const y = cy - height / 2;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={9} fill={fill} />
      <text
        x={x + width / 2}
        y={cy + 3.5}
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="10"
        fontWeight="700"
        fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
      >
        {text}
      </text>
    </g>
  );
}

function lastPointDot(fill, lastIndex) {
  return function LastDot(props) {
    const { cx, cy, index, value } = props;
    if (index !== lastIndex) return null;
    return <EndBadge cx={cx} cy={cy} value={value} fill={fill} />;
  };
}

export const UserGrowthLineChart = memo(function UserGrowthLineChart({ data }) {
  const lastIndex = Math.max(0, (data?.length || 1) - 1);
  const average = useMemo(() => {
    const values = (data || []).map((row) => Number(row.users) || 0).filter((value) => value > 0);
    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 10, right: 52, left: 2, bottom: 0 }}>
        <defs>
          <linearGradient id="userGrowthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.18} />
            <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} strokeDasharray="" />
        <XAxis
          dataKey="label"
          tick={TICK}
          axisLine={false}
          tickLine={false}
          interval={0}
          minTickGap={0}
        />
        <YAxis
          tick={TICK}
          axisLine={false}
          tickLine={false}
          width={36}
          tickFormatter={formatAxisValue}
          allowDecimals
        />
        {average != null && (
          <ReferenceLine
            y={average}
            stroke={AXIS}
            strokeDasharray="4 4"
            ifOverflow="extendDomain"
            label={{
              value: 'AVG',
              position: 'insideTopRight',
              fill: AXIS,
              fontSize: 10,
              fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
            }}
          />
        )}
        <Tooltip
          cursor={false}
          offset={16}
          allowEscapeViewBox={{ x: true, y: true }}
          wrapperStyle={{ outline: 'none', background: 'transparent', border: 'none', boxShadow: 'none' }}
          content={<GrowthTooltipContent />}
        />
        <Area
          type="monotone"
          dataKey="users"
          name="Current"
          stroke={PRIMARY}
          strokeWidth={2.5}
          fill="url(#userGrowthFill)"
          fillOpacity={1}
          dot={lastPointDot(PRIMARY, lastIndex)}
          activeDot={{ r: 5, fill: '#FFFFFF', stroke: PRIMARY, strokeWidth: 2 }}
          animationDuration={CHART_ANIMATION.duration}
          animationEasing={CHART_ANIMATION.easing}
        />
        <Line
          type="linear"
          dataKey="previous"
          name="Previous"
          stroke={SECONDARY}
          strokeWidth={2}
          isAnimationActive={false}
          dot={lastPointDot(SECONDARY, lastIndex)}
          activeDot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
});
