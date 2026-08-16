import { cn } from '../../lib/cn';

/**
 * Filled sidebar-blue KPI tile: label, large value, and supporting copy in white.
 */
export function KpiMetricCard({
  value,
  label,
  subtitle,
  progress = null,
  active = false,
  loading = false,
  onClick,
  className = '',
}) {
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      {...(onClick ? { type: 'button', onClick } : {})}
      data-on-dark
      className={cn(
        'flex min-h-0 min-w-0 flex-col rounded-xl border border-transparent bg-[#00B0FF] p-3.5 text-left text-white shadow-sm',
        'transition-all duration-150',
        onClick && 'cursor-pointer hover:-translate-y-0.5 hover:bg-[#0099E6] hover:shadow-md',
        active && 'ring-2 ring-white/80 ring-offset-2 ring-offset-transparent',
        className,
      )}
    >
      {loading ? (
        <span className="flex flex-1 flex-col gap-2.5" aria-hidden>
          <span className="h-3 w-16 animate-pulse rounded bg-white/25" />
          <span className="h-7 w-12 animate-pulse rounded bg-white/25" />
          <span className="h-2.5 w-24 animate-pulse rounded bg-white/20" />
        </span>
      ) : (
        <>
          <span className="truncate text-[11px] font-medium uppercase tracking-wide text-white/80">
            {label}
          </span>
          <span className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-white">{value}</span>
          {subtitle ? (
            <span className="mt-1 truncate text-[11px] font-normal text-white/80">{subtitle}</span>
          ) : null}
          {progress != null && Number.isFinite(Number(progress)) ? (
            <span className="mt-2.5 block h-1.5 w-full overflow-hidden rounded-full bg-white/25" aria-hidden>
              <span
                className="block h-full rounded-full bg-white transition-[width] duration-300"
                style={{ width: `${Math.min(100, Math.max(0, Number(progress)))}%` }}
              />
            </span>
          ) : null}
        </>
      )}
    </Tag>
  );
}

export function KpiMetricGrid({ children, columns = 5, className = '' }) {
  return (
    <div
      className={cn(
        'grid h-auto grid-cols-2 gap-4 py-1 md:grid-cols-3',
        columns >= 5 && 'lg:grid-cols-5',
        columns === 4 && 'lg:grid-cols-4',
        className,
      )}
    >
      {children}
    </div>
  );
}
