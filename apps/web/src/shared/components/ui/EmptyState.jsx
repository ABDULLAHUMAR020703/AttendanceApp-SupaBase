import { GlassCard } from '../GlassCard';
import { Button } from './Button';

export function EmptyState({
  icon,
  title = 'No data yet',
  description,
  actionLabel,
  onAction,
  className = '',
}) {
  return (
    <GlassCard hover={false} className={`p-8 text-center ${className}`}>
      {icon && (
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/15 text-brand-300">
          {icon}
        </div>
      )}
      <p className="text-base font-medium text-white">{title}</p>
      {description && <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">{description}</p>}
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </GlassCard>
  );
}
