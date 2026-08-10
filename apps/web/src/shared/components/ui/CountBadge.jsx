import { cn } from '../../lib/cn';

/**
 * Soft UI unread/count pill.
 * Brand tones only — Deep Sky Blue / white — so badges match the Hadir system
 * on both the cyan rail and light chrome.
 *
 * @param {'brand' | 'onBrand'} [tone='brand']
 *   brand   — cyan fill, white ink (headers, white surfaces)
 *   onBrand — white fill, deep cyan ink (sidebar / cyan rail)
 */
export function CountBadge({ count, max = 9, className = '', ring = true, tone = 'brand' }) {
  if (!count || count < 1) return null;
  const label = count > max ? `${max}+` : String(count);
  const wide = label.length > 1;

  return (
    <span
      className={cn(
        'inline-grid h-4 place-items-center rounded-full',
        wide ? 'min-w-4 px-1' : 'w-4',
        'text-[10px] font-bold tabular-nums leading-none tracking-tight',
        'antialiased [font-feature-settings:"tnum"]',
        tone === 'onBrand'
          ? 'bg-white text-[#00B2EE]'
          : 'bg-[#00B2EE] text-white',
        ring && (tone === 'onBrand' ? 'ring-2 ring-white/50' : 'ring-2 ring-white'),
        className,
      )}
      aria-hidden
    >
      {label}
    </span>
  );
}
