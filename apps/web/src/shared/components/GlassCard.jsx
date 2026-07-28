import { cn } from '../lib/cn';

export function GlassCard({ children, className = '', hover = true }) {
  return (
    <div
      className={cn(
        'rounded-card border border-[#2A2E35] bg-[#1A1D21]/80 backdrop-blur-xl shadow-glass',
        hover && 'transition-all duration-200 hover:-translate-y-0.5 hover:border-[#A0EBCF]/25 hover:shadow-glow',
        className
      )}
    >
      {children}
    </div>
  );
}
