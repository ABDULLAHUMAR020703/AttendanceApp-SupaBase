import { cn } from '../../lib/cn';

const STYLES = {
  success: 'border-emerald-300/25 bg-emerald-500/15 text-emerald-100',
  error: 'border-red-300/25 bg-red-500/15 text-red-100',
  warning: 'border-amber-300/25 bg-amber-500/15 text-amber-100',
  info: 'border-brand-300/25 bg-brand-500/15 text-brand-100',
};

export function Alert({ type = 'info', title, children, onDismiss, className = '' }) {
  return (
    <div
      role="status"
      className={cn('rounded-card border px-4 py-3 text-sm flex items-start justify-between gap-3', STYLES[type], className)}
    >
      <div>
        {title && <p className="font-medium mb-0.5">{title}</p>}
        <div>{children}</div>
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="text-xs underline opacity-80 hover:opacity-100 shrink-0">
          Dismiss
        </button>
      )}
    </div>
  );
}
