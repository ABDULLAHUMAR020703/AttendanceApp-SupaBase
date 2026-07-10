import { cn } from '../../lib/cn';

export function Select({ label, error, className = '', id, children, ...props }) {
  const selectId = id || label?.toLowerCase?.().replace(/\s+/g, '-');
  return (
    <label className="block" htmlFor={selectId}>
      {label && <span className="ui-label">{label}</span>}
      <select id={selectId} className={cn('ui-select', error && 'border-red-400/50', className)} {...props}>
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-red-300" role="alert">{error}</p>}
    </label>
  );
}
