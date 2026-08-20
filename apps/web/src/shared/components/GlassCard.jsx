import { cn } from '../lib/cn';

/**
 * The standard surface: white, 20px radius, hairline border, near-invisible
 * resting shadow that lifts on hover.
 *
 * Remaining props land on the element, so a card can also be a click target
 * without a wrapper element swallowing the handler.
 */
export function GlassCard({ children, className = '', hover = true, brand = false, ...props }) {
  return (
    <div
      className={cn('ui-card', brand && 'ui-card-brand', hover && 'ui-card-interactive', className)}
      {...props}
    >
      {children}
    </div>
  );
}
