import { RANGE_PRESETS, formatRangeLabel } from '../../../features/admin/utils/analyticsCharts';

export function DateRangeSelector({
  preset,
  customFrom,
  customTo,
  selectedRange,
  rangeInvalid,
  onPresetChange,
  onCustomFromChange,
  onCustomToChange,
  idPrefix = 'analytics',
}) {
  const groupedPresets = RANGE_PRESETS.reduce((groups, option) => {
    const group = option.group || 'Other';
    if (!groups[group]) groups[group] = [];
    groups[group].push(option);
    return groups;
  }, {});

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-medium text-white">Date range</h2>
        <p className="mt-1 text-xs text-slate-400">
          All attendance charts and KPI cards update for the selected period.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idPrefix}-range`} className="text-xs text-slate-300">
            Period
          </label>
          <select
            id={`${idPrefix}-range`}
            value={preset}
            onChange={(e) => onPresetChange(e.target.value)}
            aria-describedby={`${idPrefix}-range-hint`}
            className="glass-select rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/50"
          >
            {Object.entries(groupedPresets).map(([group, options]) => (
              <optgroup key={group} label={group}>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {preset === 'custom' && (
          <>
            <div className="flex flex-col gap-1">
              <label htmlFor={`${idPrefix}-from`} className="text-xs text-slate-300">
                From
              </label>
              <input
                id={`${idPrefix}-from`}
                type="date"
                value={customFrom}
                onChange={(e) => onCustomFromChange(e.target.value)}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/50"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={`${idPrefix}-to`} className="text-xs text-slate-300">
                To
              </label>
              <input
                id={`${idPrefix}-to`}
                type="date"
                value={customTo}
                onChange={(e) => onCustomToChange(e.target.value)}
                className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/50"
              />
            </div>
          </>
        )}
      </div>

      <div id={`${idPrefix}-range-hint`} className="text-xs text-slate-400">
        {selectedRange && !rangeInvalid && (
          <span>
            Showing data for{' '}
            <span className="text-slate-200">{formatRangeLabel(selectedRange.start, selectedRange.end)}</span>
          </span>
        )}
        {rangeInvalid && (
          <span className="text-amber-200">
            Select a valid start and end date to update charts and KPIs.
          </span>
        )}
      </div>
    </div>
  );
}
