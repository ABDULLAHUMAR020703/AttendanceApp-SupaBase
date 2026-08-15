import { memo, useId } from 'react';

const WAVE =
  'M0 18 C20 18 30 0 50 0 C70 0 80 18 100 18 C120 18 130 0 150 0 C170 0 180 18 200 18 V140 H0 Z';

function parseFillPercent(centerLabel) {
  const n = Number(String(centerLabel || '').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export const AttendanceMixPieChart = memo(function AttendanceMixPieChart({
  data,
  centerLabel,
  centerHint,
}) {
  const uid = useId().replace(/:/g, '');
  const clipId = `liquid-clip-${uid}`;
  const fill = parseFillPercent(centerLabel);
  const surface = 100 - fill;
  const onFill = fill >= 42;
  const summary = (data || [])
    .map((row) => `${row.name} ${row.value}${row.share != null ? ` (${row.share}%)` : ''}`)
    .join(', ');

  return (
    <div className="relative mx-auto flex h-full min-h-0 w-full items-center justify-center">
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full max-h-full max-w-full"
        role="img"
        aria-label={[centerLabel, centerHint, summary].filter(Boolean).join('. ')}
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx="50" cy="50" r="46" />
          </clipPath>
        </defs>

        <circle cx="50" cy="50" r="46" fill="#F0F9FD" />

        <g clipPath={`url(#${clipId})`}>
          <g transform={`translate(0 ${surface})`}>
            <svg viewBox="0 0 200 140" x="-50" y="-8" width="200" height="160" overflow="visible">
              <g className="liquid-wave-slow">
                <path d={WAVE} fill="#70C8F4" fillOpacity="0.55" />
              </g>
            </svg>
            <svg viewBox="0 0 200 140" x="-30" y="-2" width="200" height="160" overflow="visible">
              <g className="liquid-wave">
                <path d={WAVE} fill="#00B0FF" />
              </g>
            </svg>
          </g>
        </g>

        <circle cx="50" cy="50" r="46" fill="none" stroke="#00B0FF" strokeWidth="1.75" />

        {centerLabel && (
          <text
            x="50"
            y={centerHint ? '49' : '52'}
            textAnchor="middle"
            fill={onFill ? '#FFFFFF' : '#0F172A'}
            fontSize="16"
            fontWeight="700"
            fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          >
            {centerLabel}
          </text>
        )}
        {centerHint && (
          <text
            x="50"
            y="58"
            textAnchor="middle"
            fill={onFill ? 'rgba(255,255,255,0.82)' : '#8898AA'}
            fontSize="5.5"
            fontWeight="500"
            fontFamily="'Plus Jakarta Sans', system-ui, sans-serif"
          >
            {centerHint}
          </text>
        )}
      </svg>
    </div>
  );
});
