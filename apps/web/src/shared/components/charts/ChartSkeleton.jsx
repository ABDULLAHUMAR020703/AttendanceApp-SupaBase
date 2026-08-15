export function ChartSkeleton({ height = 280, variant = 'chart' }) {
  if (variant === 'kpi') {
    return (
      <div className="rounded-2xl border border-hairline bg-white p-4" aria-hidden="true">
        <div className="flex items-center justify-between">
          <div className="h-3 w-24 rounded skeleton" />
          <div className="h-8 w-8 rounded-xl skeleton" />
        </div>
        <div className="mt-4 h-8 w-16 rounded skeleton" />
        <div className="mt-3 h-3 w-32 rounded skeleton" />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col justify-end gap-3" aria-hidden="true">
      <div className="flex h-full min-h-0 items-end justify-between gap-2" style={{ minHeight: Math.min(height, 160) }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md skeleton"
            style={{ height: `${35 + (i % 3) * 18}%` }}
          />
        ))}
      </div>
      <div className="h-3 w-full rounded skeleton" />
    </div>
  );
}
