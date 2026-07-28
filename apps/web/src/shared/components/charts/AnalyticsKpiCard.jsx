import { memo } from 'react';
import { GlassCard } from '../GlassCard';

export const AnalyticsKpiCard = memo(function AnalyticsKpiCard({
  label,
  value,
  hint,
  loading = false,
  accent = 'blue',
}) {
  const accentClasses = {
    blue: 'bg-[#014871]/40 text-[#A0EBCF] shadow-[0_0_0_1px_rgba(160,235,207,0.25)]',
    green: 'bg-emerald-400/20 text-emerald-100 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]',
    amber: 'bg-amber-400/20 text-amber-100 shadow-[0_0_0_1px_rgba(245,158,11,0.35)]',
    purple: 'bg-[#5BA8C8]/25 text-sky-100 shadow-[0_0_0_1px_rgba(91,168,200,0.35)]',
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
        <p className="text-xs font-medium uppercase tracking-wide text-slate-300">{label}</p>
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${accentClasses[accent] || accentClasses.blue}`}>
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-4 4" />
          </svg>
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-white" aria-live="polite">
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[11px] text-slate-400">{hint}</p>}
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
