import { Button } from './Button';

export function PageHeader({ title, subtitle, actions, onRefresh, refreshing }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onRefresh && (
          <Button variant="secondary" size="sm" onClick={onRefresh} loading={refreshing}>
            Refresh
          </Button>
        )}
        {actions}
      </div>
    </div>
  );
}
