// Number, date and text formatting shared by every view. Pure helpers:
// same input, same string, no state.

const usd2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

// $1,234.56 / -$1,234.56
export function fmt(n) {
  const v = Math.round(n * 100) / 100;
  return `${v < 0 ? '-' : ''}$${usd2.format(Math.abs(v))}`;
}

// $1,235 / -$1,235 (whole dollars, for KPI cards and chart labels).
// The sign comes from the rounded value, so -$0.40 reads "$0", not "-$0".
export function fmt0(n) {
  const r = Math.round(n);
  return `${r < 0 ? '-' : ''}$${usd0.format(Math.abs(r))}`;
}

// 0.234 -> "23%"
export function pct(x) { return `${Math.round(x * 100)}%`; }

// "2026-11" -> "November 2026"
export function monthLabel(id) {
  const [y, m] = id.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// "2026-11" -> "Nov"
export function shortMonth(id) {
  const [y, m] = id.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });
}

// Escape user text before it goes into an HTML string.
export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
