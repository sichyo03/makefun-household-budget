// Hand-rolled SVG charts shared by more than one view (no libraries, no
// network). Each builder is a pure function of its data. Charts used by a
// single view live in that view's file instead.
import { esc, fmt0, shortMonth } from './format.js';

export function svgOpen(w, h, label) {
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" role="img" aria-label="${esc(label)}" style="display:block">`;
}

// Grouped bars: income (teal) vs spending (amber) per month, with the
// amount kept each month as a dark dot (red when the month overspent).
export function cashFlowChart(series) {
  const w = 640, h = 200, padL = 46, padB = 24, padT = 12;
  // Round the axis top up to a whole thousand so gridline labels read
  // $0 / $3,500 / $7,000 instead of $6,007.
  const max = Math.ceil(Math.max(1000, ...series.map((s) => Math.max(s.income, s.spent))) * 1.08 / 1000) * 1000;
  // Kept (income − spending) can go negative in an overspend month.
  // The axis then extends below zero (rounded down to a whole
  // thousand) so the dot sits at its true value instead of clamping
  // to the $0 line and claiming the household broke even. When every
  // month keeps money min is 0 and the chart is unchanged.
  const min = Math.floor(Math.min(0, ...series.map((s) => s.net)) / 1000) * 1000;
  const iw = w - padL - 10, ih = h - padB - padT;
  const y = (v) => padT + ih * (max - v) / (max - min);
  const zeroY = y(0);
  const slot = iw / series.length, bw = Math.min(22, slot * 0.32);
  let out = svgOpen(w, h, 'Cash flow by month: income versus spending');
  for (const v of [min, (min + max) / 2, max]) {
    out += `<line x1="${padL}" y1="${y(v)}" x2="${w - 10}" y2="${y(v)}" stroke="#e3dac7" stroke-width="1"/>`;
    out += `<text x="${padL - 6}" y="${y(v) + 4}" font-size="10" fill="#75858f" text-anchor="end">${fmt0(v)}</text>`;
  }
  if (min < 0) out += `<line x1="${padL}" y1="${zeroY}" x2="${w - 10}" y2="${zeroY}" stroke="#b9b0a0" stroke-width="1"/>`;
  series.forEach((s, i) => {
    const cx = padL + slot * i + slot / 2;
    out += `<rect x="${cx - bw - 2}" y="${y(s.income)}" width="${bw}" height="${zeroY - y(s.income)}" rx="3" fill="#0e6b5c"/>`;
    out += `<rect x="${cx + 2}" y="${y(s.spent)}" width="${bw}" height="${zeroY - y(s.spent)}" rx="3" fill="#e8a13d"/>`;
    out += `<circle cx="${cx}" cy="${y(s.net)}" r="3.5" fill="${s.net < 0 ? '#c0392b' : '#16232c'}"/>`;
    out += `<text x="${cx}" y="${h - 7}" font-size="11" fill="#41525e" text-anchor="middle">${shortMonth(s.month)}</text>`;
  });
  out += '</svg>';
  out += `<div class="chart-legend">
    <span><span class="cat-dot" style="background:#0e6b5c"></span>Income</span>
    <span><span class="cat-dot" style="background:#e8a13d"></span>Spending</span>
    <span><span class="cat-dot round" style="background:#16232c"></span>Kept (income − spending)</span></div>`;
  return out;
}

// Donut of category shares with the month total in the middle.
export function donutChart(rows, colors, size = 190) {
  const s = size, r = s / 2 - 8, cx = s / 2, cy = s / 2, thick = Math.round(s * 0.16);
  const valueSize = Math.round(s * 0.12), labelSize = Math.round(s * 0.07);
  const total = rows.reduce((sum, x) => sum + x.total, 0);
  let angle = -Math.PI / 2, out = svgOpen(s, s, 'Spending by category');
  // One category at 100% cannot be an arc (identical endpoints draw
  // nothing), so it is a full ring; no spending at all is an empty ring
  // around an honest $0.
  if (rows.length === 1) {
    out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors[rows[0].category] || '#999'}" stroke-width="${thick}"/>`;
  } else if (rows.length === 0) {
    out += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e3dac7" stroke-width="${thick}"/>`;
  }
  for (const row of rows.length > 1 ? rows : []) {
    const frac = row.total / total, a2 = angle + frac * Math.PI * 2;
    const large = frac > 0.5 ? 1 : 0;
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    out += `<path d="M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}" fill="none" stroke="${colors[row.category] || '#999'}" stroke-width="${thick}"/>`;
    angle = a2;
  }
  out += `<text x="${cx}" y="${cy - 2}" font-size="${valueSize}" font-weight="700" fill="#16232c" text-anchor="middle">${fmt0(total)}</text>`;
  out += `<text x="${cx}" y="${cy + labelSize + 5}" font-size="${labelSize}" fill="#75858f" text-anchor="middle">spent</text>`;
  return `${out}</svg>`;
}

// Budget progress bar with an even-pace tick: the marker shows where
// spending "should" be today if it were spread evenly over the month.
export function budgetBar(used, limit, paceFrac) {
  // A $0 limit with any spend is fully over (frac 2 pins the bar full
  // and red); a $0 limit with no spend is an empty bar.
  const frac = limit > 0 ? used / limit : (used > 0 ? 2 : 0);
  const cls = frac > 1 ? 'over' : frac >= 0.8 ? 'near' : '';
  const marker = paceFrac != null && paceFrac > 0 && paceFrac < 1
    ? `<div class="pace-tick" title="Even-pace marker" style="left:${(paceFrac * 100).toFixed(1)}%"></div>` : '';
  return `<div class="progress"><div class="${cls}" style="width:${Math.min(100, frac * 100).toFixed(1)}%"></div>${marker}</div>`;
}

// Goal progress ring (SVG circle stroke) with the funded percent.
export function goalRing(saved, target, size = 84) {
  const s = size, r = s / 2 - 7, c = 2 * Math.PI * r;
  const frac = target > 0 ? Math.min(1, saved / target) : 0;
  return `<svg viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" role="img" aria-label="Goal ${Math.round(frac * 100)}% funded">
    <circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="#efe8d8" stroke-width="9"/>
    <circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="#0e6b5c" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(c * frac).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${s / 2} ${s / 2})"/>
    <text x="${s / 2}" y="${s / 2 + 5}" font-size="16" font-weight="700" fill="#16232c" text-anchor="middle">${Math.round(frac * 100)}%</text></svg>`;
}
