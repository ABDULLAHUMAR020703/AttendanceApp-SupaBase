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
  primary: '#00B2EE',
  primarySoft: 'rgba(0, 178, 238, 0.22)',
  secondary: '#70C9EF',
  secondarySoft: 'rgba(112, 201, 239, 0.22)',
  tertiary: '#3ABCEF',
  quaternary: '#0090C4',
  muted: '#C2ECF9',
  /* Chart chrome tracks the surface and border ladders in index.css. */
  grid: 'rgba(15, 23, 42, 0.06)',
  axis: '#DCEFF7',
  /* Ice cyan well — short bars still read as values, never defects. */
  track: '#E0F6FC',
  tick: '#64748B',
  tooltipBg: '#FFFFFF',
  tooltipBorder: '#DCEFF7',
};

/*
 * Rank ladder: vivid → sky (no deep forest teal).
 */
export const CHART_RANKS = ['#00B2EE', '#3ABCEF', '#70C9EF'];
export const CHART_RANK_REST = '#C2ECF9';

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
  color: '#0F172A',
  fontSize: '12px',
  boxShadow: '0 12px 32px rgba(15,23,42,0.10)',
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
