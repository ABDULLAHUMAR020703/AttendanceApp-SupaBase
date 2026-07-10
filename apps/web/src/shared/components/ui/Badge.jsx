import { cn } from '../../lib/cn';

const VARIANTS = {
  default: 'bg-white/10 text-slate-200 border-white/15',
  primary: 'bg-brand-500/20 text-brand-100 border-brand-400/30',
  success: 'bg-emerald-500/20 text-emerald-100 border-emerald-400/30',
  warning: 'bg-amber-500/20 text-amber-100 border-amber-400/30',
  danger: 'bg-red-500/20 text-red-100 border-red-400/30',
  muted: 'bg-slate-500/20 text-slate-300 border-slate-400/20',
};

export function Badge({ variant = 'default', className = '', children }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', VARIANTS[variant], className)}>
      {children}
    </span>
  );
}
