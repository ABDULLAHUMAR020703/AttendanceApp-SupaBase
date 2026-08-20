import { memo } from 'react';
import { KpiMetricCard } from '../ui/KpiMetricCard';

export const AnalyticsKpiCard = memo(function AnalyticsKpiCard({
  label,
  value,
  hint,
  loading = false,
}) {
  return (
    <KpiMetricCard
      label={label}
      value={value}
      subtitle={hint}
      loading={loading}
      className="hover:-translate-y-0.5 hover:bg-[#0099E6] hover:shadow-md"
    />
  );
});

export const AnalyticsKpiGrid = memo(function AnalyticsKpiGrid({ items, loading = false, className = '' }) {
  return (
    <section
      className={`kpi-grid grid h-auto grid-cols-2 gap-4 py-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6 ${className}`}
      aria-label="Analytics key performance indicators"
    >
      {items.map((item) => (
        <AnalyticsKpiCard
          key={item.id}
          label={item.label}
          value={item.value}
          hint={item.hint}
          loading={loading}
        />
      ))}
    </section>
  );
});
