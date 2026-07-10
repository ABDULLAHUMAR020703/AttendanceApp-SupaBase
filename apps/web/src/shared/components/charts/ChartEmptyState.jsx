export function ChartEmptyState({
  title = 'No data available',
  description,
  actions = [],
  icon,
}) {
  return (
    <div
      className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 px-6 py-8 text-center"
      role="status"
      aria-live="polite"
    >
      {icon && (
        <div className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-300">
          {icon}
        </div>
      )}
      <div className="space-y-1.5 max-w-sm">
        <p className="text-sm font-medium text-slate-200">{title}</p>
        {description && <p className="text-xs leading-relaxed text-slate-400">{description}</p>}
      </div>
      {actions.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-slate-100 transition-all duration-200 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/50"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
