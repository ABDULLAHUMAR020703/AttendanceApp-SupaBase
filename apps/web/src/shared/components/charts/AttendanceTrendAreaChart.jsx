import { memo, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Area, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const OCEAN = '#00B0FF';
const SKY = '#70C8F4';
const STEEL = '#8898AA';
const CHART_FONT = "'Plus Jakarta Sans', system-ui, sans-serif";

const AXIS_TICK = {
  fill: STEEL,
  fontSize: 11,
  fontWeight: 500,
  fontFamily: CHART_FONT,
};

function movingAverage(values, windowSize = 3) {
  return values.map((_, index) => {
    const start = Math.max(0, index - Math.floor(windowSize / 2));
    const end = Math.min(values.length, start + windowSize);
    const slice = values.slice(start, end);
    if (!slice.length) return 0;
    return Math.round(slice.reduce((sum, value) => sum + value, 0) / slice.length);
  });
}

function enrichTrendData(data) {
  const rows = Array.isArray(data) ? data : [];
  const values = rows.map((row) => Number(row.checkins) || 0);
  const hasPrevious = rows.some((row) => row.previous != null);
  const expected = hasPrevious
    ? rows.map((row) => Number(row.previous) || 0)
    : movingAverage(values);

  let maxIndex = 0;
  values.forEach((value, index) => {
    if (value > values[maxIndex]) maxIndex = index;
  });

  const peakCandidates = new Set();
  for (let index = 1; index < values.length - 1; index += 1) {
    if (values[index] > values[index - 1] && values[index] >= values[index + 1] && values[index] > 0) {
      peakCandidates.add(index);
    }
  }
  if (values[maxIndex] > 0) peakCandidates.add(maxIndex);

  let peaks = [...peakCandidates];
  if (peaks.length > 4) {
    peaks = peaks.sort((a, b) => values[b] - values[a]).slice(0, 4);
    if (!peaks.includes(maxIndex) && values[maxIndex] > 0) peaks.push(maxIndex);
  }
  const peakSet = new Set(peaks);
  const lastIndex = Math.max(0, rows.length - 1);

  return rows.map((row, index) => {
    const checkins = values[index];
    const priorPoint = index > 0 ? values[index - 1] : null;
    const priorExpected = expected[index];
    let pointDelta = null;
    if (priorPoint > 0) {
      pointDelta = Math.round(((checkins - priorPoint) / priorPoint) * 100);
    } else if (priorExpected > 0) {
      pointDelta = Math.round(((checkins - priorExpected) / priorExpected) * 100);
    }

    return {
      ...row,
      checkins,
      expected: expected[index],
      pointDelta,
      isPeak: peakSet.has(index),
      isMilestone: index === maxIndex && values[maxIndex] > 0 && rows.length >= 3,
      isLast: index === lastIndex,
    };
  });
}

function DeltaBadge({ delta }) {
  if (delta == null) return null;
  const rising = delta > 0;
  const falling = delta < 0;
  const tone = rising
    ? 'border-emerald-200/50 bg-emerald-50 text-[#059669]'
    : falling
      ? 'border-rose-200/50 bg-rose-50 text-[#E11D48]'
      : 'border-slate-200/70 bg-slate-100 text-[#8898AA]';

  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums ${tone}`}>
      {delta === 0 ? '0%' : `${rising ? '+' : ''}${delta}%`}
    </span>
  );
}

function placeTooltip({ coordinate, viewBox, width, height, gap = 12 }) {
  const vbX = viewBox?.x ?? 0;
  const vbY = viewBox?.y ?? 0;
  const vbW = viewBox?.width ?? 0;
  const vbH = viewBox?.height ?? 0;
  const x = Number(coordinate?.x) || 0;
  const y = Number(coordinate?.y) || 0;

  let left = x - width / 2;
  let placement = 'above';
  let top = y - height - gap;

  if (vbH && top < vbY + 4) {
    placement = 'below';
    top = y + gap;
  }
  if (vbH && top + height > vbY + vbH - 4) {
    placement = 'above';
    top = Math.max(vbY + 4, y - height - gap);
  }

  const minLeft = vbW ? vbX + 4 : 4;
  const maxLeft = vbW ? vbX + vbW - width - 4 : left;
  left = Math.min(Math.max(left, minLeft), Math.max(minLeft, maxLeft));

  const caretX = Math.min(width - 14, Math.max(14, x - left));
  return { left, top, placement, caretX, x, y };
}

function TrendTooltip({ active, payload, label, coordinate, viewBox }) {
  const cardRef = useRef(null);
  const [size, setSize] = useState({ width: 168, height: 108 });

  useLayoutEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    setSize((prev) =>
      Math.abs(prev.width - rect.width) < 1 && Math.abs(prev.height - rect.height) < 1
        ? prev
        : { width: rect.width, height: rect.height },
    );
  }, [active, payload, label]);

  if (!active || !payload?.length || !coordinate) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const { left, top, placement, caretX, y } = placeTooltip({
    coordinate,
    viewBox,
    width: size.width,
    height: size.height,
  });
  const stem = Math.max(6, Math.abs(placement === 'above' ? y - (top + size.height) : top - y) - 2);

  return (
    <div
      className="pointer-events-none absolute z-30"
      style={{
        left,
        top,
        transition: 'left 180ms ease, top 180ms ease',
      }}
    >
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: placement === 'above' ? 8 : -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 520, damping: 34 }}
        className="relative min-w-[150px] rounded-xl border border-slate-200/80 bg-white/95 p-3 text-left shadow-xl backdrop-blur-md"
        role="tooltip"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-xs font-medium text-[#8898AA]">{row.fullLabel || label}</p>
          <DeltaBadge delta={row.pointDelta} />
        </div>
        <div className="mt-2 flex items-end">
          <span className="text-2xl font-bold tabular-nums leading-none text-slate-900">{row.checkins}</span>
          <span className="ml-1.5 self-end text-sm font-medium text-slate-600">Check-ins</span>
        </div>
        {row.expected != null && (
          <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-800">
            <span className="inline-flex items-center text-xs text-[#8898AA]">
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#70C8F4]" aria-hidden />
              Expected
            </span>
            <span className="text-xs font-semibold tabular-nums text-slate-800">{row.expected}</span>
          </div>
        )}
        <span
          aria-hidden
          className="absolute h-2 w-2 rotate-45 border-slate-200/80 bg-white"
          style={
            placement === 'above'
              ? { left: caretX - 4, bottom: -4, borderBottomWidth: 1, borderRightWidth: 1 }
              : { left: caretX - 4, top: -4, borderTopWidth: 1, borderLeftWidth: 1 }
          }
        />
      </motion.div>
      <span
        aria-hidden
        className="absolute w-px bg-[#00B0FF]/40"
        style={{
          left: caretX,
          ...(placement === 'above'
            ? { top: '100%', height: stem }
            : { bottom: '100%', height: stem }),
        }}
      />
    </div>
  );
}

function MilestoneCallout({ cx, cy, value, width, filterId }) {
  if (cx == null || cy == null) return null;
  const cardWidth = 102;
  const cardHeight = 42;
  let x = cx + 12;
  let y = Math.max(2, cy - cardHeight - 10);
  if (width && x + cardWidth > width - 4) x = Math.max(4, cx - cardWidth - 12);

  return (
    <g className="pointer-events-none">
      <rect
        x={x}
        y={y}
        width={cardWidth}
        height={cardHeight}
        rx={14}
        fill="rgba(255,255,255,0.96)"
        stroke="#E2E8F0"
        strokeWidth={1}
        filter={filterId ? `url(#${filterId})` : undefined}
      />
      <text x={x + 12} y={y + 16} fill={STEEL} fontSize={10} fontWeight={500} fontFamily={CHART_FONT}>
        Peak
      </text>
      <text x={x + 12} y={y + 32} fill="#0F172A" fontSize={13} fontWeight={700} fontFamily={CHART_FONT}>
        {value} check-ins
      </text>
    </g>
  );
}

function LastTrendMark({ cx, cy, rising }) {
  if (cx == null || cy == null) return null;
  const size = 18;
  const x = cx + 8;
  const y = cy - size / 2;
  const color = rising ? OCEAN : STEEL;

  return (
    <g className="pointer-events-none">
      <rect x={x} y={y} width={size} height={size} rx={5} fill="#E6F4FA" />
      {rising ? (
        <polyline
          points={`${x + 5},${y + 12} ${x + 9},${y + 6} ${x + 13},${y + 12}`}
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : (
        <polyline
          points={`${x + 5},${y + 6} ${x + 9},${y + 12} ${x + 13},${y + 6}`}
          fill="none"
          stroke={color}
          strokeWidth={1.8}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
    </g>
  );
}

function TrendMarks({ cx, cy, payload, uid, showMilestone, width }) {
  if (cx == null || cy == null || !payload) return null;
  const showLast = payload.isLast && !payload.isMilestone;
  if (!payload.isPeak && !(showMilestone && payload.isMilestone) && !showLast) return null;

  return (
    <g>
      {payload.isPeak && (
        <g filter={`url(#${uid}-glow)`}>
          <circle cx={cx} cy={cy} r={7} fill={OCEAN} fillOpacity={0.16} />
          <circle cx={cx} cy={cy} r={4} fill={OCEAN} stroke="#FFFFFF" strokeWidth={2} />
        </g>
      )}
      {showMilestone && payload.isMilestone && (
        <MilestoneCallout cx={cx} cy={cy} value={payload.checkins} width={width} filterId={`${uid}-card`} />
      )}
      {payload.isLast && !payload.isMilestone && (
        <LastTrendMark cx={cx} cy={cy} rising={payload.pointDelta == null || payload.pointDelta >= 0} />
      )}
    </g>
  );
}

function PeakActiveDot({ cx, cy }) {
  if (cx == null || cy == null) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill={OCEAN} fillOpacity={0.16} />
      <circle cx={cx} cy={cy} r={4.5} fill={OCEAN} stroke="#FFFFFF" strokeWidth={2} />
    </g>
  );
}

export const AttendanceTrendAreaChart = memo(function AttendanceTrendAreaChart({
  data,
  showMilestone = true,
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const wrapRef = useRef(null);
  const [plotWidth, setPlotWidth] = useState(0);
  const chartData = useMemo(() => enrichTrendData(data), [data]);
  const hasExpected = chartData.some((row) => row.expected != null);

  useEffect(() => {
    const node = wrapRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const update = () => setPlotWidth(node.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const renderMarks = useCallback(
    (props) => (
      <TrendMarks
        {...props}
        uid={uid}
        showMilestone={showMilestone}
        width={plotWidth}
      />
    ),
    [uid, showMilestone, plotWidth],
  );

  return (
    <div ref={wrapRef} className="attendance-trend-chart h-full w-full overflow-visible">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 22, right: 22, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id={`${uid}-ocean`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={OCEAN} stopOpacity={0.35} />
              <stop offset="100%" stopColor={OCEAN} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SKY} stopOpacity={0.2} />
              <stop offset="100%" stopColor={SKY} stopOpacity={0} />
            </linearGradient>
            <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={OCEAN} floodOpacity="0.4" />
            </filter>
            <filter id={`${uid}-card`} x="-30%" y="-30%" width="160%" height="180%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0F172A" floodOpacity="0.1" />
            </filter>
          </defs>
          <CartesianGrid
            stroke="rgba(136,152,170,0.15)"
            strokeDasharray="4 4"
            vertical
          />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            minTickGap={16}
          />
          <YAxis
            tick={AXIS_TICK}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            tickCount={4}
            allowDecimals={false}
            width={32}
            domain={[0, (max) => Math.max(1, Math.ceil((Number(max) || 0) * 1.12))]}
          />
          <Tooltip
            content={<TrendTooltip />}
            cursor={{ stroke: OCEAN, strokeWidth: 1, strokeDasharray: '3 3', strokeOpacity: 0.28 }}
            offset={0}
            allowEscapeViewBox={{ x: true, y: true }}
            position={{ x: 0, y: 0 }}
            isAnimationActive={false}
            wrapperStyle={{
              outline: 'none',
              background: 'transparent',
              border: 'none',
              boxShadow: 'none',
              pointerEvents: 'none',
              zIndex: 30,
              overflow: 'visible',
              position: 'absolute',
              top: 0,
              left: 0,
              transform: 'none',
            }}
          />
          {hasExpected && (
            <Area
              type="natural"
              dataKey="expected"
              name="Expected"
              stroke={SKY}
              strokeWidth={2}
              fill={`url(#${uid}-sky)`}
              fillOpacity={1}
              dot={false}
              activeDot={false}
              animationDuration={480}
              animationEasing="ease-out"
            />
          )}
          <Area
            type="natural"
            dataKey="checkins"
            name="Check-ins"
            stroke={OCEAN}
            strokeWidth={2.5}
            fill={`url(#${uid}-ocean)`}
            fillOpacity={1}
            dot={renderMarks}
            activeDot={PeakActiveDot}
            animationDuration={560}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
});
