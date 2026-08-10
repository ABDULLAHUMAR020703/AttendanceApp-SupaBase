import { ArrowRight } from 'lucide-react';

const STEPS = [
  {
    n: '01',
    title: 'Export attendance logs',
    description: 'Download clean check-in history for audits and ops reviews.',
  },
  {
    n: '02',
    title: 'Profile-level reports',
    description: 'Drill into each employee with confidence-backed timelines.',
  },
  {
    n: '03',
    title: 'Monthly breakdowns',
    description: 'See trends by month without exporting into spreadsheets first.',
  },
  {
    n: '04',
    title: 'Payroll-ready summaries',
    description: 'Hand finance totals that match policy and exceptions.',
  },
];

/**
 * Compact horizontal 4-step process — matches the linear numbered flow reference.
 */
export function FeatureHighlightsChecklist({ className = '' }) {
  return (
    <ol
      className={`grid grid-cols-1 gap-6 py-4 sm:grid-cols-2 sm:gap-5 sm:py-5 lg:grid-cols-4 lg:gap-6 lg:py-6 ${className}`.trim()}
      aria-label="Analytics feature process"
    >
      {STEPS.map(({ n, title, description }, index) => {
        const isLast = index === STEPS.length - 1;
        return (
          <li key={n} className="min-w-0">
            {/* Number + directional arrow (omitted on final step) */}
            <div className="flex items-center gap-3">
              <span className="text-[2.35rem] font-extrabold leading-none tracking-tight text-[#00bcff] sm:text-[2.6rem]">
                {n}
              </span>
              {!isLast && (
                <ArrowRight
                  className="mt-1 hidden h-5 w-5 shrink-0 text-[#7dd3fc] sm:mt-1.5 lg:block"
                  strokeWidth={1.75}
                  aria-hidden
                />
              )}
            </div>

            <h3 className="mt-2 text-sm font-bold leading-snug tracking-[-0.01em] text-slate-900 sm:text-[15px]">
              {title}
            </h3>
            <p className="mt-1.5 max-w-[18rem] text-xs leading-5 text-slate-500">{description}</p>
          </li>
        );
      })}
    </ol>
  );
}
