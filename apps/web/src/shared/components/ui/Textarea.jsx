import { cn } from '../../lib/cn';

export function Textarea({ label, error, hint, className = '', id, rows = 4, ...props }) {
  const textareaId = id || label?.toLowerCase?.().replace(/\s+/g, '-');
  return (
    <label className="block" htmlFor={textareaId}>
      {label && <span className="ui-label">{label}</span>}
      <textarea
        id={textareaId}
        rows={rows}
        className={cn('ui-input resize-y min-h-[6rem]', error && 'border-red-400/50 focus:ring-red-400/30', className)}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-red-300" role="alert">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </label>
  );
}
