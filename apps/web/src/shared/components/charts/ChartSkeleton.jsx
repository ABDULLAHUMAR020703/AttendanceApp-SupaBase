export function ChartSkeleton({ height = 280, variant = 'chart' }) {
  if (variant === 'kpi') {
    return (
      <div className="rounded-2xl border border-white/15 bg-white/10 p-4" aria-hidden="true">
        <div className="flex items-center justify-between">
          <div className="h-3 w-24 rounded skeleton" />
          <div className="h-8 w-8 rounded-lg skeleton" />
        </div>
        <div className="mt-4 h-8 w-16 rounded skeleton" />
        <div className="mt-3 h-3 w-32 rounded skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-3" aria-hidden="true">
      <div className="space-y-2">
        <div className="h-4 w-40 rounded skeleton" />
        <div className="h-3 w-56 rounded skeleton" />
      </div>
      <div
        className="rounded-lg border border-white/10 bg-slate-950/30 p-4"
        style={{ minHeight: height }}
      >
        <div className="flex h-full flex-col justify-end gap-3" style={{ minHeight: height - 32 }}>
          <div className="flex items-end justify-between gap-2 h-40">
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
      </div>
    </div>
  );
}
