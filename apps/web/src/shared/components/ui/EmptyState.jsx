import { Inbox } from 'lucide-react';
import { cn } from '../../lib/cn';
import { GlassCard } from '../GlassCard';
import { Button } from './Button';

const GLYPH_SIZES = {
  sm: { halo: 'h-14 w-14', inner: 'inset-2', tile: 'h-8 w-8 rounded-xl', icon: 'h-4 w-4' },
  md: { halo: 'h-20 w-20', inner: 'inset-2.5', tile: 'h-11 w-11 rounded-2xl', icon: 'h-5 w-5' },
};

/**
 * Concentric cyan halo behind a single glyph. Two rings of tint rather than an
 * illustration: it carries brand at any size and never looks like a missing image.
 */
export function EmptyGlyph({ icon: Icon = Inbox, size = 'md', className = '' }) {
  const s = GLYPH_SIZES[size] || GLYPH_SIZES.md;
  return (
    <span className={cn('relative grid place-items-center', s.halo, className)}>
      <span className="absolute inset-0 rounded-full bg-accent-50" aria-hidden />
      <span className={cn('absolute rounded-full bg-accent-100', s.inner)} aria-hidden />
      <span className={cn('relative grid place-items-center bg-white text-accent-700 shadow-hair', s.tile)}>
        <Icon className={s.icon} aria-hidden />
      </span>
    </span>
  );
}

/**
 * The body of every empty state in the app: glyph, headline, one sentence of
 * explanation, an optional line of contextual guidance, and one primary action.
 *
 * The action is what separates an intentional empty state from an unfinished one —
 * it tells the reader the screen is working and what to do about it being blank.
 */
export function EmptyStateBody({
  icon,
  title = 'Nothing here yet',
  description,
  hint,
  action,
  size = 'md',
  className = '',
}) {
  const compact = size === 'sm';

  return (
    <div
      className={cn('flex flex-col items-center justify-center text-center', className)}
      role="status"
      aria-live="polite"
    >
      <EmptyGlyph icon={icon} size={size} className={compact ? 'mb-3' : 'mb-5'} />

      <p className={cn('font-semibold text-ink', compact ? 'text-body-tight' : 'text-subheading')}>{title}</p>

      {description && (
        <p
          className={cn(
            'mx-auto mt-1.5 leading-relaxed text-ink-muted',
            compact ? 'max-w-[17rem] text-caption' : 'max-w-sm text-body',
          )}
        >
          {description}
        </p>
      )}

      {hint && <p className="mt-2 text-micro font-medium uppercase tracking-[0.06em] text-ink-faint">{hint}</p>}

      {action && <div className={compact ? 'mt-4' : 'mt-5'}>{action}</div>}
    </div>
  );
}

/**
 * Standalone empty state: the same body on its own card, for when a whole section
 * or page has no content to show.
 */
export function EmptyState({
  icon,
  title,
  description,
  hint,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
  action,
  size = 'md',
  className = '',
}) {
  const buttons =
    action ||
    ((actionLabel && onAction) || (secondaryLabel && onSecondaryAction) ? (
      <div className="flex flex-wrap items-center justify-center gap-2">
        {actionLabel && onAction && (
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        )}
        {secondaryLabel && onSecondaryAction && (
          <Button variant="secondary" size="sm" onClick={onSecondaryAction}>
            {secondaryLabel}
          </Button>
        )}
      </div>
    ) : null);

  return (
    <GlassCard hover={false} className={cn('px-8 py-12', className)}>
      <EmptyStateBody icon={icon} title={title} description={description} hint={hint} action={buttons} size={size} />
    </GlassCard>
  );
}
