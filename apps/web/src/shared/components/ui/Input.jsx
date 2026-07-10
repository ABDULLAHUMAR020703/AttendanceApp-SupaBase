import { cn } from '../../lib/cn';

export function Input({ label, error, hint, className = '', id, ...props }) {
  const inputId = id || label?.toLowerCase?.().replace(/\s+/g, '-');
  return (
    <label className="block" htmlFor={inputId}>
      {label && <span className="ui-label">{label}</span>}
      <input id={inputId} className={cn('ui-input', error && 'border-red-400/50 focus:ring-red-400/30', className)} {...props} />
      {error && <p className="mt-1 text-xs text-red-300" role="alert">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </label>
  );
}
