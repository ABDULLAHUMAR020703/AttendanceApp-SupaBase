/*
 * Series colours are four steps of the brand ramp rather than four hues: on a single
 * chart the reader distinguishes them by value, and a second hue would imply a
 * semantic the data doesn't carry. Ordered light-to-dark, matching accent 600-900.
 *
 * These keys name a *series slot*, not a rank. For ordered data — a leaderboard, a
 * department bar list, a top-three — use CHART_RANKS below, which runs deep-to-light
 * so the leading value is the heaviest mark on the page.
 */
export const CHART_COLORS = {
  primary: '#0097A7',
  primarySoft: 'rgba(0, 151, 167, 0.22)',
  secondary: '#00838F',
  secondarySoft: 'rgba(0, 131, 143, 0.18)',
  tertiary: '#006978',
  quaternary: '#005A66',
  muted: '#C7EFF5',
  /* Chart chrome tracks the surface and border ladders in index.css. */
  grid: 'rgba(27, 36, 48, 0.055)',
  axis: '#E2F3F5',
  /* Ice-teal well, matching `.ui-track` — the grey it used to be made a short bar
     read as a defect rather than as a low value. */
  track: '#E6F7F9',
  tick: '#55657B',
  tooltipBg: '#FFFFFF',
  tooltipBorder: '#E2F3F5',
};

/*
 * Rank ladder: tier 1 deep, tier 2 brand, tier 3 light. Weight falls with rank, so
 * position in an ordered list is legible without reading a single number.
 *
 * Ranks past third share one pale tint on purpose — a fourth and fifth distinct step
 * would be a difference the reader has to decode rather than see, and the list order
 * already carries it. `rankColor` clamps, so a 20-row list stays on the system.
 */
export const CHART_RANKS = ['#006978', '#0097A7', '#4DD0E1'];
export const CHART_RANK_REST = '#A9E4EC';

export const rankColor = (index) => CHART_RANKS[index] || CHART_RANK_REST;

/* Plus Jakarta Sans is the only family the app loads; SVG text has to be told. */
const CHART_FONT = "'Plus Jakarta Sans', system-ui, sans-serif";

export const CHART_HEIGHT = 300;

export const CHART_MARGINS = {
  default: { top: 12, right: 16, left: 8, bottom: 20 },
  bar: { top: 12, right: 16, left: 8, bottom: 28 },
  line: { top: 12, right: 16, left: 8, bottom: 16 },
};

export const CHART_AXIS = {
  stroke: CHART_COLORS.axis,
  tick: {
    fill: CHART_COLORS.tick,
    fontSize: 11,
    fontWeight: 500,
    fontFamily: CHART_FONT,
  },
};

export const CHART_GRID = {
  strokeDasharray: '3 3',
  stroke: CHART_COLORS.grid,
  vertical: false,
};

export const CHART_ANIMATION = {
  duration: 600,
  easing: 'ease-out',
};

export const CHART_TOOLTIP_STYLE = {
  backgroundColor: CHART_COLORS.tooltipBg,
  border: `1px solid ${CHART_COLORS.tooltipBorder}`,
  borderRadius: '14px',
  color: '#1B2430',
  fontSize: '12px',
  boxShadow: '0 12px 32px rgba(27,36,48,0.10)',
  padding: '10px 12px',
};

export const CHART_LEGEND_STYLE = {
  color: CHART_COLORS.tick,
  fontSize: '12px',
  fontFamily: CHART_FONT,
  paddingTop: '8px',
};

export function formatAxisLabel(value) {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  return value;
}

export function formatPercent(value, total) {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}
