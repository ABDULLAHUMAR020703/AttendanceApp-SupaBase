import { memo, useId, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const SIZE = 160;
const CX = SIZE / 2;
const CY = SIZE / 2;
const TRACK_R = 62;
const OUTER_W = 3.75;
const INNER_W = 13;
const GAP_DEG = 5;
const MIN_INNER_SWEEP = 16;

function polar(r, angle) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function arcPath(r, startAngle, endAngle) {
  const sweep = endAngle - startAngle;
  if (sweep >= 359.2) {
    return `M ${CX} ${CY - r} A ${r} ${r} 0 1 1 ${CX} ${CY + r} A ${r} ${r} 0 1 1 ${CX} ${CY - r}`;
  }
  const start = polar(r, startAngle);
  const end = polar(r, endAngle);
  const large = sweep > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`;
}

function innerOpacity(name, hovered) {
  if (hovered) return 0.22;
  if (name === 'Remote') return 0.15;
  if (name === 'Not in') return 0.1;
  return 0.12;
}

function buildArcs(data) {
  const live = (data || []).filter((row) => Number(row.value) > 0);
  const total = (data || []).reduce((sum, row) => sum + (Number(row.value) || 0), 0);
  if (!live.length || !total) return [];

  const gap = live.length > 1 ? GAP_DEG : 0;
  let cursor = 0;

  return live
    .map((row) => {
      const sweep = (row.value / total) * 360;
      const start = cursor + gap / 2;
      const end = cursor + sweep - gap / 2;
      cursor += sweep;
      if (end <= start) return null;
      const d = arcPath(TRACK_R, start, end);
      return {
        ...row,
        start,
        end,
        sweep: end - start,
        d,
      };
    })
    .filter(Boolean);
}

function CenterMetric({ active, coverage }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {active ? (
        <motion.div
          key={active.name}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="flex flex-col items-center px-3 text-center"
        >
          <p className="text-2xl font-bold tabular-nums leading-none text-slate-900 md:text-3xl">{active.share}%</p>
          <p className="mt-1 text-xs font-medium text-[#8898AA]">
            • {active.name}: {active.value} [{active.share}%]
          </p>
        </motion.div>
      ) : (
        <motion.div
          key="coverage"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          className="flex flex-col items-center px-3 text-center"
        >
          <p className="text-2xl font-bold tabular-nums leading-none text-slate-900 md:text-3xl">{coverage}%</p>
          <p className="mt-1 text-xs font-medium text-[#8898AA]">In today</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export const AttendanceMixPieChart = memo(function AttendanceMixPieChart({
  data,
  coverage = 0,
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const reduceMotion = useReducedMotion();
  const [activeName, setActiveName] = useState(null);

  const rows = useMemo(
    () =>
      (data || []).map((row) => ({
        ...row,
        value: Number(row.value) || 0,
        share: Number(row.share) || 0,
      })),
    [data],
  );
  const arcs = useMemo(() => buildArcs(rows), [rows]);
  const active = rows.find((row) => row.name === activeName) || null;
  const summary = rows.map((row) => `${row.name} ${row.value} (${row.share}%)`).join(', ');

  return (
    <div
      className="flex h-full w-full min-w-0 flex-col gap-4 sm:flex-row sm:items-stretch"
      onMouseLeave={() => setActiveName(null)}
    >
      <div className="relative mx-auto h-[9.5rem] w-[9.5rem] shrink-0 self-center sm:mx-0">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full overflow-visible" role="img" aria-hidden>
          <defs>
            {arcs.map((arc) => (
              <filter
                key={arc.name}
                id={`${uid}-${arc.name.replace(/\s+/g, '')}-glow`}
                x="-50%"
                y="-50%"
                width="200%"
                height="200%"
              >
                <feDropShadow dx="0" dy="0" stdDeviation="2.2" floodColor={arc.color} floodOpacity="0.45" />
              </filter>
            ))}
          </defs>

          {arcs.length === 0 && (
            <circle
              cx={CX}
              cy={CY}
              r={TRACK_R}
              fill="none"
              stroke="#E2E8F0"
              strokeWidth={INNER_W}
              strokeOpacity={0.55}
            />
          )}

          {arcs.map((arc, index) => {
            const hovered = activeName === arc.name;
            const dimmed = Boolean(activeName && !hovered);
            const filterId = `${uid}-${arc.name.replace(/\s+/g, '')}-glow`;

            return (
              <motion.g
                key={arc.name}
                initial={false}
                animate={{
                  scale: hovered && !reduceMotion ? 1.03 : 1,
                  opacity: dimmed ? 0.4 : 1,
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                style={{ transformOrigin: `${CX}px ${CY}px`, transformBox: 'view-box' }}
              >
                {arc.sweep >= MIN_INNER_SWEEP && (
                  <motion.path
                    d={arc.d}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth={INNER_W}
                    strokeLinecap="round"
                    strokeOpacity={innerOpacity(arc.name, hovered)}
                    initial={reduceMotion ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.06 }}
                  />
                )}
                <motion.path
                  d={arc.d}
                  fill="none"
                  stroke={arc.color}
                  strokeWidth={hovered ? 4.75 : OUTER_W}
                  strokeLinecap="round"
                  filter={hovered ? `url(#${filterId})` : undefined}
                  initial={reduceMotion ? false : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.08 + index * 0.06 }}
                />
                <path
                  d={arc.d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={22}
                  strokeLinecap="round"
                  className="cursor-pointer"
                  onMouseEnter={() => setActiveName(arc.name)}
                />
              </motion.g>
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <CenterMetric active={active} coverage={coverage} />
        </div>
      </div>

      <ul className="grid min-w-0 flex-1 grid-rows-3 gap-2">
        {rows.map((row) => {
          const hovered = activeName === row.name;
          const dimmed = Boolean(activeName && !hovered);
          return (
            <li key={row.name} className="min-h-0">
              <button
                type="button"
                onMouseEnter={() => setActiveName(row.name)}
                onFocus={() => setActiveName(row.name)}
                className="flex h-full w-full flex-col justify-center rounded-xl border border-slate-200/70 bg-white px-3.5 py-2 text-left transition-all duration-[250ms] ease-out hover:border-slate-200 hover:shadow-sm"
                style={{ opacity: dimmed ? 0.4 : 1 }}
              >
                <span className="flex items-baseline justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.color }} aria-hidden />
                    <span className="truncate text-sm font-medium text-slate-800">{row.name}</span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-1.5 tabular-nums">
                    <span className="text-sm font-semibold text-slate-700">{row.value}</span>
                    <span className="text-xs text-[#8898AA]">{row.share}%</span>
                  </span>
                </span>
                <span className="mt-2 block h-1.5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden>
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${Math.max(row.share, row.value > 0 ? 4 : 0)}%`, backgroundColor: row.color }}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <span className="sr-only">{`In today ${coverage}%. ${summary}`}</span>
    </div>
  );
});
