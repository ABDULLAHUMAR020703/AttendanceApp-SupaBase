import { cn } from '../../lib/cn';

/**
 * Unread/count pill. Alert red with white ink so the number stays readable
 * on both the cyan rail and light chrome.
 *
 * @param {'brand' | 'onBrand'} [tone='brand'] kept for call-site compatibility
 */
export function CountBadge({ count, max = 9, className = '', ring = true, tone = 'brand' }) {
  if (!count || count < 1) return null;
  const label = count > max ? `${max}+` : String(count);
  const wide = label.length > 1;
  void tone;

  return (
    <span
      className={cn(
        'count-badge inline-grid h-4 place-items-center rounded-full',
        wide ? 'min-w-4 px-1' : 'w-4',
        'bg-[#EF4444] text-[10px] font-bold tabular-nums leading-none tracking-tight text-white',
        'antialiased [font-feature-settings:"tnum"]',
        ring && 'ring-2 ring-white',
        className,
      )}
      style={{ backgroundColor: '#EF4444', color: '#FFFFFF' }}
      aria-hidden
    >
      {label}
    </span>
  );
}
