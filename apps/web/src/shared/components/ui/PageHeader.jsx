import { RefreshCw } from 'lucide-react';
import { Button } from './Button';

/**
 * Standard page header: title and one-line subtitle on the left, refresh plus
 * page actions on the right. The primary action always sits furthest right.
 */
export function PageHeader({ title, subtitle, actions, onRefresh, refreshing }) {
  return (
    <div className="ui-card flex flex-wrap items-end justify-between gap-4 px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <h1 className="page-title text-[#0F172A]">{title}</h1>
        {subtitle && <p className="page-subtitle text-[#64748B]">{subtitle}</p>}
      </div>
      {(onRefresh || actions) && (
        <div className="flex flex-wrap items-center gap-2">
          {onRefresh && (
            <Button variant="secondary" size="sm" onClick={onRefresh} loading={refreshing}>
              {!refreshing && <RefreshCw className="h-4 w-4" aria-hidden />}
              Refresh
            </Button>
          )}
          {actions}
        </div>
      )}
    </div>
  );
}
