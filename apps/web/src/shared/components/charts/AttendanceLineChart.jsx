import { memo, useCallback, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const FILL = '#00AEEF';
const STROKE = '#0096d6';
const CHECKOUTS = '#7dd3fc';
const TICK = '#94a3b8';
const FLOOR_RATIO_SPARSE = 0.4;
const FLOOR_RATIO_DENSE = 0.08;
const EDGE_PADS = 2;
const CHART_FONT = "'Plus Jakarta Sans', system-ui, sans-serif";

const AXIS_TICK = {
  fill: TICK,
  fontSize: 11,
  fontWeight: 500,
  fontFamily: CHART_FONT,
};

function gaussianSmooth(values, sigma) {
  const n = values.length;
  if (!n) return [];
  const radius = Math.max(1, Math.ceil(sigma * 3));
  return values.map((_, i) => {
    let sum = 0;
    let weight = 0;
    for (let k = -radius; k <= radius; k += 1) {
      const j = i + k;
      if (j < 0 || j >= n) continue;
      const w = Math.exp(-(k * k) / (2 * sigma * sigma));
      sum += values[j] * w;
      weight += w;
    }
    return weight ? sum / weight : values[i];
  });
}

function shiftSeries(values, offset) {
  const n = values.length;
  if (!n) return [];
  return values.map((_, i) => {
    const src = i - offset;
    if (src <= 0) return values[0];
    if (src >= n - 1) return values[n - 1];
    const left = Math.floor(src);
    const t = src - left;
    return values[left] * (1 - t) + values[left + 1] * t;
  });
}

function applyFloor(values, floor) {
  return values.map((value) => Math.max(value, floor));
}

function padEdges(rows, pads = EDGE_PADS) {
  if (!rows.length) return rows;
  const first = rows[0];
  const last = rows[rows.length - 1];
  const start = Array.from({ length: pads }, (_, index) => ({
    ...first,
    key: `__pad-start-${index}`,
    date: '',
    label: '',
    isPad: true,
  }));
  const end = Array.from({ length: pads }, (_, index) => ({
    ...last,
    key: `__pad-end-${index}`,
    date: '',
    label: '',
    isPad: true,
  }));
  return [...start, ...rows, ...end];
}

function niceYScale(peak) {
  const value = Math.max(0, Number(peak) || 0);
  if (value <= 20) {
    const max = Math.max(5, Math.ceil(value / 5) * 5);
    const step = max <= 10 ? (max <= 5 ? 1 : 2) : 5;
    const ticks = [];
    for (let tick = 0; tick <= max; tick += step) ticks.push(tick);
    return { domain: [0, max], ticks };
  }
  if (value <= 100) {
    return { domain: [0, 100], ticks: [0, 25, 50, 75, 100] };
  }
  const max = Math.ceil(value / 25) * 25;
  const step = max / 4;
  return { domain: [0, max], ticks: [0, step, step * 2, step * 3, max] };
}

function formatAxisDate(value) {
  if (!value) return '';
  const text = String(value);
  if (/^[A-Za-z]{3}\s+\d{1,2}$/.test(text)) return text;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function pickDateTicks(rows, count = 6) {
  const real = rows.filter((row) => !row.isPad && (row.label || row.date));
  if (!real.length) return [];
  if (real.length <= count) return real.map((row) => row.label || formatAxisDate(row.date));
  const last = real.length - 1;
  const step = Math.max(1, Math.round(last / (count - 1)));
  const ticks = [];
  for (let index = 0; index < last; index += step) {
    ticks.push(real[index].label || formatAxisDate(real[index].date));
  }
  const endLabel = real[last].label || formatAxisDate(real[last].date);
  if (ticks[ticks.length - 1] !== endLabel) ticks.push(endLabel);
  return ticks;
}

function enrichSeries(data) {
  const rows = Array.isArray(data) ? data : [];
  const checkins = rows.map((row) => Number(row.checkins) || 0);
  const events = rows.map((row, index) => {
    const checkouts = Number(row.checkouts) || 0;
    return Number(row.events) || checkins[index] + checkouts;
  });
  const activeDays = events.filter((value) => value > 0).length;
  const dense = activeDays >= 8;
  const sigma = dense
    ? Math.min(0.9, Math.max(0.55, rows.length / 40))
    : Math.min(2.6, Math.max(1.2, rows.length / 14));
  const smoothed = gaussianSmooth(checkins, sigma);
  const peak = Math.max(...smoothed, ...checkins, 1);
  const floor = peak * (dense ? FLOOR_RATIO_DENSE : FLOOR_RATIO_SPARSE);
  const wave = applyFloor(smoothed, floor);
  const waveSoft = applyFloor(
    shiftSeries(wave, Math.max(2, rows.length * 0.08)),
    floor * 0.85,
  );
  const waveMist = applyFloor(
    shiftSeries(wave, -Math.max(2.5, rows.length * 0.14)),
    floor * 0.72,
  );

  return padEdges(
    rows.map((row, index) => ({
      ...row,
      checkins: checkins[index],
      checkouts: Number(row.checkouts) || 0,
      events: events[index],
      wave: wave[index],
      waveSoft: waveSoft[index],
      waveMist: waveMist[index],
      label: row.label || formatAxisDate(row.date),
    })),
  );
}

function inDomain(value, domain) {
  if (!domain || domain.length < 2 || value == null) return true;
  const [min, max] = domain;
  if (min != null && value < min) return false;
  if (max != null && value > max) return false;
  return true;
}

function ActiveDot({ cx, cy }) {
  if (cx == null || cy == null) return null;
  return (
    <g className="attendance-activity-dot">
      <circle cx={cx} cy={cy} r={10} fill={FILL} fillOpacity={0.18} />
      <circle cx={cx} cy={cy} r={5} fill="#ffffff" stroke={STROKE} strokeWidth={2.5} />
    </g>
  );
}

function MetricRow({ color, label, value, valueClassName }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <span className="inline-flex items-center gap-2 text-xs text-slate-500">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </span>
      <span className={`text-xs tabular-nums ${valueClassName}`}>{value}</span>
    </div>
  );
}

function ActivityTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row || row.isPad) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      className="min-w-[168px] rounded-xl border border-slate-100/80 bg-white/90 px-3.5 py-2.5 shadow-lg backdrop-blur-md transition-all"
      role="tooltip"
    >
      <p className="text-xs font-semibold text-slate-700">{row.label || formatAxisDate(row.date)}</p>
      <div className="mt-2 space-y-1.5">
        <MetricRow
          color={FILL}
          label="Check-ins"
          value={row.checkins}
          valueClassName="font-bold text-slate-900"
        />
        <MetricRow
          color={CHECKOUTS}
          label="Check-outs"
          value={row.checkouts}
          valueClassName="font-medium text-slate-600"
        />
      </div>
    </motion.div>
  );
}

export const AttendanceLineChart = memo(function AttendanceLineChart({
  data,
  xDomain,
  yDomain,
}) {
  const reduceMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(null);

  const chartData = useMemo(() => {
    const series = Array.isArray(data) ? data : [];
    const filtered = xDomain
      ? series.filter((row) => inDomain(row.date || row.key, xDomain))
      : series;
    return enrichSeries(filtered);
  }, [data, xDomain]);

  const xTicks = useMemo(() => pickDateTicks(chartData), [chartData]);

  const yScale = useMemo(() => {
    if (yDomain) {
      const max = Number(yDomain[1]) || 0;
      return niceYScale(max);
    }
    const peak = chartData.reduce(
      (max, row) => (row.isPad ? max : Math.max(max, row.wave, row.checkins)),
      0,
    );
    return niceYScale(peak);
  }, [chartData, yDomain]);

  const handleMove = useCallback((state) => {
    const next = state?.activeTooltipIndex;
    setActiveIndex(typeof next === 'number' ? next : null);
  }, []);

  const handleLeave = useCallback(() => setActiveIndex(null), []);

  const activeDot = useCallback((props) => <ActiveDot cx={props.cx} cy={props.cy} />, []);

  if (!chartData.length) return null;

  const animate = !reduceMotion;

  return (
    <div
      className={`attendance-activity-chart h-full min-h-[280px] w-full bg-white ${
        reduceMotion ? 'is-reduced-motion' : ''
      }`}
      data-active-index={activeIndex ?? undefined}
    >
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={chartData}
          margin={{ top: 16, right: 12, left: 8, bottom: 8 }}
          onMouseMove={handleMove}
          onMouseLeave={handleLeave}
        >
          <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            ticks={xTicks}
            interval="preserveStartEnd"
            axisLine={false}
            tickLine={false}
            tick={{ ...AXIS_TICK, dy: 10 }}
            tickMargin={4}
            minTickGap={18}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={AXIS_TICK}
            ticks={yScale.ticks}
            domain={yScale.domain}
            width={44}
            tickMargin={6}
            allowDecimals={false}
          />
          <Tooltip
            content={<ActivityTooltip />}
            cursor={false}
            offset={16}
            animationDuration={animate ? 140 : 0}
            animationEasing="ease-out"
            wrapperStyle={{
              outline: 'none',
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              zIndex: 20,
            }}
          />
          <Area
            type="basis"
            dataKey="waveMist"
            stroke="none"
            fill={FILL}
            fillOpacity={0.15}
            dot={false}
            activeDot={false}
            isAnimationActive={animate}
            animationDuration={900}
            animationEasing="ease-out"
            baseValue={0}
          />
          <Area
            type="basis"
            dataKey="waveSoft"
            stroke="none"
            fill={FILL}
            fillOpacity={0.25}
            dot={false}
            activeDot={false}
            isAnimationActive={animate}
            animationBegin={60}
            animationDuration={900}
            animationEasing="ease-out"
            baseValue={0}
          />
          <Area
            type="basis"
            dataKey="wave"
            name="Check-ins"
            stroke="none"
            fill={FILL}
            fillOpacity={1}
            dot={false}
            activeDot={false}
            isAnimationActive={animate}
            animationBegin={90}
            animationDuration={900}
            animationEasing="ease-out"
            baseValue={0}
          />
          <Line
            type="basis"
            dataKey="wave"
            stroke={STROKE}
            strokeWidth={2}
            dot={false}
            activeDot={activeDot}
            isAnimationActive={animate}
            animationBegin={90}
            animationDuration={900}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});
