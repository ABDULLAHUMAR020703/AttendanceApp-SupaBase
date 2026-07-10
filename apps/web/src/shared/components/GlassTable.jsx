import { cn } from '../lib/cn';

export function GlassTable({ columns, children, emptyMessage, loading, skeletonRows = 5 }) {
  return (
    <div className="overflow-hidden rounded-card border border-white/15 bg-white/10 backdrop-blur-xl shadow-glass">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-slate-100">
          <thead className="bg-white/[0.06] border-b border-white/10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={cn('px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-300', col.className)}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 skeleton w-full max-w-[8rem]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : children}
          </tbody>
        </table>
      </div>
      {!loading && !children && emptyMessage && (
        <p className="px-4 py-8 text-center text-sm text-slate-400">{emptyMessage}</p>
      )}
    </div>
  );
}

export function TableRow({ children, className = '' }) {
  return <tr className={cn('ui-table-row', className)}>{children}</tr>;
}

export function TableCell({ children, className = '' }) {
  return <td className={cn('ui-table-cell', className)}>{children}</td>;
}
