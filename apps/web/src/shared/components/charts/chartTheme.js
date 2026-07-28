export const CHART_COLORS = {
  primary: '#014871',
  primarySoft: 'rgba(1, 72, 113, 0.18)',
  secondary: '#A0EBCF',
  secondarySoft: 'rgba(160, 235, 207, 0.18)',
  tertiary: '#F59E0B',
  quaternary: '#5BA8C8',
  muted: '#94A3B8',
  grid: 'rgba(255, 255, 255, 0.08)',
  axis: '#64748B',
  tick: '#CBD5E1',
  tooltipBg: 'rgba(13, 15, 18, 0.97)',
  tooltipBorder: 'rgba(42, 46, 53, 0.9)',
};

export const CHART_HEIGHT = 300;

export const CHART_MARGINS = {
  default: { top: 12, right: 16, left: 8, bottom: 20 },
  bar: { top: 12, right: 16, left: 8, bottom: 28 },
  line: { top: 12, right: 16, left: 8, bottom: 16 },
};

export const CHART_AXIS = {
  stroke: CHART_COLORS.axis,
  tick: { fill: CHART_COLORS.tick, fontSize: 11, fontFamily: 'Inter, system-ui, sans-serif' },
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
  borderRadius: '10px',
  color: '#F8FAFC',
  fontSize: '12px',
  boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
  padding: '10px 12px',
};

export const CHART_LEGEND_STYLE = {
  color: CHART_COLORS.tick,
  fontSize: '12px',
  fontFamily: 'Inter, system-ui, sans-serif',
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
