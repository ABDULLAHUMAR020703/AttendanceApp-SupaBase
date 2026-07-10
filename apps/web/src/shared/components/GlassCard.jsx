import { cn } from '../lib/cn';

export function GlassCard({ children, className = '', hover = true }) {
  return (
    <div
      className={cn(
        'rounded-card border border-white/15 bg-white/10 backdrop-blur-xl shadow-glass',
        hover && 'transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:shadow-glow',
        className
      )}
    >
      {children}
    </div>
  );
}
