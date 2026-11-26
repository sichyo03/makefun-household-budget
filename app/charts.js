// Hand-drawn SVG charts: a donut for category share and grouped bars for
// the three-month trend. Pure string building, no library, no network.

import { categoryOf, moneyShort } from './data.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function donutChart(rows, size) {
  const total = rows.reduce((sum, r) => sum + r.total, 0);
  if (!total) return '<p class="muted">No spending recorded this month.</p>';
  const r = 80;
  const cx = 100;
  const cy = 100;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  const segments = rows.map((row) => {
    const share = row.total / total;
    const len = Math.max(0, share * circumference - 2);
    const seg = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="'
      + categoryOf(row.category).color + '" stroke-width="26" stroke-dasharray="'
      + len.toFixed(1) + ' ' + (circumference - len).toFixed(1) + '" stroke-dashoffset="'
      + (-offset).toFixed(1) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')"/>';
    offset += share * circumference;
    return seg;
  }).join('');
  const legend = rows.map((row) => {
    const cat = categoryOf(row.category);
    const pct = Math.round((row.total / total) * 100);
    return '<li><span class="swatch" style="background:' + cat.color + '"></span>'
      + esc(cat.label) + ' <strong>' + moneyShort(row.total) + '</strong> <span class="muted">' + pct + '%</span></li>';
  }).join('');
  return '<div class="donut-wrap"><svg viewBox="0 0 200 200" width="' + (size || 200) + '" height="' + (size || 200)
    + '" role="img" aria-label="Spending by category">' + segments
    + '<text x="100" y="96" text-anchor="middle" class="donut-total">' + moneyShort(total) + '</text>'
    + '<text x="100" y="116" text-anchor="middle" class="donut-caption">spent</text></svg>'
    + '<ul class="legend">' + legend + '</ul></div>';
}

export function trendBars(monthsData) {
  // monthsData: [{label, income, spending, saved}]
  const max = Math.max(...monthsData.map((m) => Math.max(m.income, m.spending + m.saved)), 1);
  const groups = monthsData.map((m) => {
    const incH = Math.round((m.income / max) * 120);
    const outH = Math.round(((m.spending + m.saved) / max) * 120);
    return '<div class="trend-group"><div class="trend-bars">'
      + '<div class="trend-bar income" style="height:' + incH + 'px" title="Income ' + moneyShort(m.income) + '"></div>'
      + '<div class="trend-bar out" style="height:' + outH + 'px" title="Out ' + moneyShort(m.spending + m.saved) + '"></div>'
      + '</div><div class="trend-label">' + esc(m.label) + '</div>'
      + '<div class="trend-vals"><span class="pos">' + moneyShort(m.income) + '</span> / <span class="neg">' + moneyShort(m.spending + m.saved) + '</span></div></div>';
  }).join('');
  return '<div class="trend">' + groups + '</div>'
    + '<p class="legend-line"><span class="swatch" style="background:#2a9d8f"></span> Income '
    + '<span class="swatch" style="background:#c94f6d"></span> Spending + savings</p>';
}

export function progressBar(used, limit) {
  // A zero limit means "no budget set": show an empty bar rather than
  // dividing by zero and painting a misleading full one.
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const cls = pct >= 100 ? 'over' : pct >= 80 ? 'warn' : 'ok';
  return '<div class="bar"><div class="bar-fill ' + cls + '" style="width:' + pct + '%"></div></div>';
}

export function goalRing(saved, target) {
  const pct = target > 0 ? Math.min(100, Math.round((saved / target) * 100)) : 0;
  const r = 30;
  const c = 2 * Math.PI * r;
  const len = (pct / 100) * c;
  return '<svg viewBox="0 0 72 72" width="72" height="72" role="img" aria-label="' + pct + '% saved">'
    + '<circle cx="36" cy="36" r="' + r + '" fill="none" stroke="#e7ddd0" stroke-width="8"/>'
    + '<circle cx="36" cy="36" r="' + r + '" fill="none" stroke="#14665a" stroke-width="8" stroke-linecap="round" '
    + 'stroke-dasharray="' + len.toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 36 36)"/>'
    + '<text x="36" y="41" text-anchor="middle" class="ring-pct">' + pct + '%</text></svg>';
}
