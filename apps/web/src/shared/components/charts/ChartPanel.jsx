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
      className={`chart-panel flex h-full flex-col space-y-3 print:break-inside-avoid ${className}`}
      aria-labelledby={panelId ? `${panelId}-title` : undefined}
    >
      <header>
        <h3 id={`${panelId}-title`} className="text-sm font-medium text-white">
          {title}
        </h3>
        {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
      </header>

      <div
        className="chart-surface flex flex-1 flex-col rounded-lg border border-white/10 bg-slate-950/30 p-3 sm:p-4 transition-opacity duration-300"
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
