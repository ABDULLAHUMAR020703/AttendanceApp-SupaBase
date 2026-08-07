import { forwardRef } from 'react';
import { ChartEmptyState } from './ChartEmptyState';
import { ChartSkeleton } from './ChartSkeleton';

export const ChartPanel = forwardRef(function ChartPanel(
  {
    title,
    subtitle,
    loading = false,
    recalculating = false,
    isEmpty = false,
    emptyState,
    height = 300,
    chartId,
    children,
    className = '',
    exportId,
  },
  ref
) {
  const showSkeleton = loading || recalculating;
  const panelId = chartId || exportId || title?.toLowerCase().replace(/\s+/g, '-');

  return (
    <article
      ref={ref}
      id={exportId}
      data-chart-export={exportId || undefined}
      className={`chart-panel flex h-full flex-col space-y-3 rounded-2xl border border-hairline bg-white p-4 shadow-[0_12px_32px_rgba(27,36,48,0.06)] print:break-inside-avoid ${className}`}
      aria-labelledby={panelId ? `${panelId}-title` : undefined}
    >
      <header>
        <h3 id={`${panelId}-title`} className="text-sm font-semibold text-[#1B2430]">
          {title}
        </h3>
        {subtitle && <p className="mt-1 text-xs text-ink-muted">{subtitle}</p>}
      </header>

      <div
        className="chart-surface flex flex-1 flex-col rounded-2xl border border-hairline bg-accent-50 p-3 transition-opacity duration-200 sm:p-4"
        style={{ minHeight: height }}
        role="img"
        aria-label={`${title} chart`}
      >
        {showSkeleton ? (
          <ChartSkeleton height={height} />
        ) : isEmpty ? (
          <ChartEmptyState {...emptyState} />
        ) : (
          <div key={recalculating ? 'recalc' : 'ready'} className="chart-content h-full w-full animate-fade-in">
            {children}
          </div>
        )}
      </div>
    </article>
  );
});
