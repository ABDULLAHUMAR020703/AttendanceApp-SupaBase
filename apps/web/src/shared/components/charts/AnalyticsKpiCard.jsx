import { memo } from 'react';
import { GlassCard } from '../GlassCard';

export const AnalyticsKpiCard = memo(function AnalyticsKpiCard({
  label,
  value,
  hint,
  loading = false,
  accent = 'blue',
}) {
  /*
   * The four `accent` names are inherited from the old multi-hue KPI row. They now all
   * resolve to steps of the one brand ramp — kept as separate keys only so callers
   * don't have to change, and ordered light-to-dark so a row of cards still reads as
   * four distinct chips. Every step is AA on the accent-50 chip behind it.
   */
  const accentClasses = {
    blue: 'bg-accent-50 text-accent-700 shadow-[0_0_0_1px_rgba(0,131,143,0.26)]',
    green: 'bg-accent-50 text-accent-800 shadow-[0_0_0_1px_rgba(0,105,120,0.24)]',
    amber: 'bg-accent-50 text-accent-900 shadow-[0_0_0_1px_rgba(0,90,102,0.20)]',
    purple: 'bg-accent-50 text-accent-900 shadow-[0_0_0_1px_rgba(0,90,102,0.18)]',
  };

  if (loading) {
    return (
      <GlassCard className="p-4" aria-hidden="true">
        <div className="h-3 w-24 rounded skeleton" />
        <div className="mt-4 h-8 w-14 rounded skeleton" />
        <div className="mt-2 h-3 w-32 rounded skeleton" />
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-xl ${accentClasses[accent] || accentClasses.blue}`}>
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-4 4" />
          </svg>
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-[#1B2430]" aria-live="polite">
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[11px] text-ink-muted">{hint}</p>}
    </GlassCard>
  );
});

export const AnalyticsKpiGrid = memo(function AnalyticsKpiGrid({ items, loading = false, className = '' }) {
  return (
    <section
      className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 ${className}`}
      aria-label="Analytics key performance indicators"
    >
      {items.map((item) => (
        <AnalyticsKpiCard key={item.id} {...item} loading={loading} />
      ))}
    </section>
  );
});
