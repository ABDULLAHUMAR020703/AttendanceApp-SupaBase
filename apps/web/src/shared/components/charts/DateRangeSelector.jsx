import { RANGE_PRESETS, formatRangeLabel } from '../../../features/admin/utils/analyticsCharts';
import { DatePickerField } from '../../../features/admin/pages/calendarPickers';
import { Select } from '../ui/Select';

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
  compact = false,
}) {
  const groupedPresets = RANGE_PRESETS.reduce((groups, option) => {
    const group = option.group || 'Other';
    if (!groups[group]) groups[group] = [];
    groups[group].push(option);
    return groups;
  }, {});

  const periodSelect = (
    <Select
      id={`${idPrefix}-range`}
      size={compact ? 'sm' : 'md'}
      value={preset}
      onChange={(e) => onPresetChange(e.target.value)}
      aria-label="Date range"
      aria-describedby={`${idPrefix}-range-hint`}
      className={compact ? 'w-auto min-w-[9.5rem]' : undefined}
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
    </Select>
  );

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {periodSelect}
        {preset === 'custom' && (
          <>
            <DatePickerField
              id={`${idPrefix}-from`}
              size="toolbar"
              value={customFrom}
              onChange={onCustomFromChange}
              aria-label="Start date"
            />
            <DatePickerField
              id={`${idPrefix}-to`}
              size="toolbar"
              value={customTo}
              onChange={onCustomToChange}
              aria-label="End date"
            />
          </>
        )}
        <span id={`${idPrefix}-range-hint`} className="sr-only">
          {selectedRange && !rangeInvalid
            ? formatRangeLabel(selectedRange.start, selectedRange.end)
            : rangeInvalid
              ? 'Select a valid start and end date'
              : ''}
        </span>
      </div>
    );
  }

  return (
    <div className="ui-toolbar space-y-4 rounded-2xl border border-hairline bg-white p-4 shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
      <div>
        <h2 className="text-sm font-semibold text-[#0F172A]">Date range</h2>
        <p className="mt-1 text-xs text-ink-muted">
          All attendance charts and KPI cards update for the selected period.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idPrefix}-range`} className="text-xs font-semibold text-ink-muted">
            Period
          </label>
          <Select
            id={`${idPrefix}-range`}
            value={preset}
            onChange={(e) => onPresetChange(e.target.value)}
            aria-describedby={`${idPrefix}-range-hint`}
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
          </Select>
        </div>

        {preset === 'custom' && (
          <>
            <div className="flex flex-col gap-1">
              <label htmlFor={`${idPrefix}-from`} className="text-xs font-semibold text-ink-muted">
                From
              </label>
              <DatePickerField
                id={`${idPrefix}-from`}
                size="input"
                value={customFrom}
                onChange={onCustomFromChange}
                aria-label="Start date"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor={`${idPrefix}-to`} className="text-xs font-semibold text-ink-muted">
                To
              </label>
              <DatePickerField
                id={`${idPrefix}-to`}
                size="input"
                value={customTo}
                onChange={onCustomToChange}
                aria-label="End date"
              />
            </div>
          </>
        )}
      </div>

      <div id={`${idPrefix}-range-hint`} className="text-xs text-ink-muted">
        {selectedRange && !rangeInvalid && (
          <span>
            Showing data for{' '}
            <span className="font-semibold text-[#0F172A]">{formatRangeLabel(selectedRange.start, selectedRange.end)}</span>
          </span>
        )}
        {rangeInvalid && (
          <span className="font-medium text-warning-ink">
            Select a valid start and end date to update charts and KPIs.
          </span>
        )}
      </div>
    </div>
  );
}
