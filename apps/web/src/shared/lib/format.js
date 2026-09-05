/**
 * Payroll is the first feature in this app that needs currency formatting —
 * there is no existing shared date/currency util to reuse (every page today
 * re-implements its own toLocaleDateString call). Kept intentionally small.
 */

export function formatCurrency(amount, currencyCode = 'PKR') {
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode || 'PKR',
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    // Unknown/invalid ISO code — fall back to a plain labelled number rather than throwing.
    return `${currencyCode || ''} ${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`.trim();
  }
}

export function formatNumber(value, options = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return new Intl.NumberFormat(undefined, options).format(n);
}

export function formatDate(value, options = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, options);
}

export function formatDateRange(start, end) {
  if (!start) return '—';
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) return '—';
  const from = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (!end) return from;
  const endDate = new Date(end);
  if (Number.isNaN(endDate.getTime())) return from;
  const sameMonth = startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear();
  const to = endDate.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${from} – ${to}`;
}
