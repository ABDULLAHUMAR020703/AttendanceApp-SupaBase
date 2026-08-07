import { cn } from '../../lib/cn';

/**
 * Skeletons stand in for the shape of the content that is coming, not for a generic
 * grey box. Matching the final layout is what keeps the page from jumping when data
 * lands — a 32px block where a 52px row will appear is a layout shift with extra
 * steps.
 *
 * Wrap a group in `SkeletonGroup` so assistive tech announces one loading state
 * instead of a dozen anonymous blocks.
 */
export function Skeleton({ className = '', rounded = 'rounded-lg' }) {
  return <span className={cn('skeleton block', rounded, className)} aria-hidden />;
}

export function SkeletonGroup({ label = 'Loading', className = '', children }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/** Paragraph stand-in. The last line is short, the way real text ends mid-measure. */
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn('h-3', i === lines - 1 ? 'w-2/5' : i % 2 ? 'w-4/5' : 'w-full')} />
      ))}
    </div>
  );
}

/**
 * Stand-in for a list of record cards: avatar, two lines of identity, trailing
 * status chip. Mirrors the request/ticket/attendance card layouts.
 */
export function SkeletonCardList({ count = 3, className = '' }) {
  return (
    <SkeletonGroup className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="ui-card flex items-center gap-3 p-4">
          <Skeleton className="h-9 w-9 shrink-0" rounded="rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-40 max-w-[60%]" />
            <Skeleton className="h-3 w-56 max-w-[80%]" />
          </div>
          <Skeleton className="h-[22px] w-16 shrink-0" rounded="rounded-full" />
        </div>
      ))}
    </SkeletonGroup>
  );
}

/** Stand-in for a form or settings panel: label/field pairs at real field height. */
export function SkeletonForm({ fields = 4, className = '' }) {
  return (
    <SkeletonGroup className={cn('space-y-4', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" rounded="rounded-xl" />
        </div>
      ))}
    </SkeletonGroup>
  );
}

/** Stand-in for a stacked feed of short entries (logs, activity, notifications). */
export function SkeletonFeed({ count = 4, className = '' }) {
  return (
    <SkeletonGroup className={cn('space-y-2.5', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="mt-0.5 h-7 w-7 shrink-0" rounded="rounded-full" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </SkeletonGroup>
  );
}
