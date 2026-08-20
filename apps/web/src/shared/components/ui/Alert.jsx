import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

const STYLES = {
  success: 'border-success-border bg-success-surface text-success-ink',
  error: 'border-danger-border bg-danger-surface text-danger-ink',
  warning: 'border-warning-border bg-warning-surface text-warning-ink',
  info: 'border-accent-200 bg-accent-50 text-accent-600',
};

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

export function Alert({ type = 'info', title, children, onDismiss, className = '' }) {
  const Icon = ICONS[type] || Info;

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm', STYLES[type], className)}
    >
      <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        <div className={cn('leading-relaxed', title && 'mt-0.5 opacity-90')}>{children}</div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}
