import { cn } from '../../lib/cn';

/**
 * Soft UI unread/count pill.
 * Vivid Cyan (#02EFF0) fill + Storm Green (#0F282F) ink — grid-centered so the
 * digit stays sharp and optically centered at small sizes.
 */
export function CountBadge({ count, max = 9, className = '', ring = true }) {
  if (!count || count < 1) return null;
  const label = count > max ? `${max}+` : String(count);
  const wide = label.length > 1;

  return (
    <span
      className={cn(
        'inline-grid h-4 place-items-center rounded-full',
        wide ? 'min-w-4 px-1' : 'w-4',
        'bg-[#02EFF0] text-[10px] font-bold tabular-nums leading-none tracking-tight text-[#0F282F]',
        'antialiased [font-feature-settings:"tnum"]',
        ring && 'ring-2 ring-white',
        className,
      )}
      aria-hidden
    >
      {label}
    </span>
  );
}
