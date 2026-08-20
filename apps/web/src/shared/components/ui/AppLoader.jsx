import { Skeleton } from './Skeleton';

/**
 * Boot state for the whole app. Rather than a centred spinner on an empty page,
 * this lays out the chrome that is about to appear — nav rail, header, page title,
 * KPI strip, cards — so the arrival of the real shell is a fill-in rather than a
 * complete repaint.
 */
export function AppLoader({ label = 'Loading workspace' }) {
  return (
    <div className="page-wash flex min-h-dvh w-full" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>

      {/* Collapsed nav rail: same 64px footprint the real sidebar occupies at rest. */}
      <div className="hidden w-16 shrink-0 flex-col items-center gap-2 border-r border-hairline bg-surface-subtle py-4 md:flex">
        <Skeleton className="h-9 w-9" rounded="rounded-xl" />
        <div className="mt-4 flex flex-col gap-2.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8" rounded="rounded-lg" />
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* 56px header, matching TopBar's height so nothing shifts vertically. */}
        <div className="flex h-14 shrink-0 items-center gap-4 border-b border-hairline bg-white/85 px-4 md:px-6">
          <Skeleton className="h-3.5 w-32" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-8 w-16" rounded="rounded-lg" />
            <Skeleton className="h-8 w-8" rounded="rounded-lg" />
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-4 md:p-6">
          <div className="mx-auto w-full max-w-[1400px] space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="ui-card space-y-4 p-5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="ui-card h-64 p-6 lg:col-span-2" />
              <div className="ui-card h-64 p-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
