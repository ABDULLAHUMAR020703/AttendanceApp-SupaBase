/**
 * Standard page header: title and one-line subtitle on the left, page actions
 * on the right. The primary action always sits furthest right.
 */
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="ui-card flex flex-wrap items-end justify-between gap-4 px-4 py-3 sm:px-5">
      <div className="min-w-0">
        {title && <h1 className="page-title text-[#0F172A]">{title}</h1>}
        {subtitle && <p className="page-subtitle text-[#64748B]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
