export function ChartEmptyState({
  title = 'No data available',
  description,
  actions = [],
  icon,
}) {
  return (
    <div
      className="flex h-full min-h-0 flex-col items-center justify-center gap-3 px-6 py-6 text-center"
      role="status"
      aria-live="polite"
    >
      {icon && (
        <div className="grid h-11 w-11 place-items-center rounded-full border border-[#D0ECF9] bg-[#E6F4FA] text-[#00BCFF]">
          {icon}
        </div>
      )}
      <div className="space-y-1.5 max-w-sm">
        <p className="text-sm font-semibold text-[#0F172A]">{title}</p>
        {description && <p className="text-xs leading-relaxed text-ink-muted">{description}</p>}
      </div>
      {actions.length > 0 && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              onClick={action.onClick}
              className="rounded-2xl border border-hairline bg-white px-3 py-1.5 text-xs font-semibold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-accent-200 hover:bg-[#E6F4FA] hover:text-accent-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600/30"
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
