// HearthLedger v2 charts: small hand-rolled SVG builders (no libraries,
// no network). Every chart is a pure function of its data.
import { esc, fmt0, shortMonth } from './state.js';

function svgOpen(w, h, label) {
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" role="img" aria-label="' + esc(label) + '" style="display:block">';
}

// Grouped bars: income (teal) vs spending (amber) per month, net as dots.
export function cashFlowChart(series) {
  const w = 640, h = 240, padL = 46, padB = 26, padT = 14;
  const max = Math.max(1000, ...series.map((s) => Math.max(s.income, s.spent))) * 1.08;
  const iw = w - padL - 10, ih = h - padB - padT;
  const slot = iw / series.length, bw = Math.min(22, slot * 0.32);
  let out = svgOpen(w, h, 'Cash flow by month: income versus spending');
  for (const frac of [0, 0.5, 1]) {
    const y = padT + ih * (1 - frac);
    out += '<line x1="' + padL + '" y1="' + y + '" x2="' + (w - 10) + '" y2="' + y + '" stroke="#e3dac7" stroke-width="1"/>';
    out += '<text x="' + (padL - 6) + '" y="' + (y + 4) + '" font-size="10" fill="#75858f" text-anchor="end">' + fmt0(max * frac) + '</text>';
  }
  series.forEach((s, i) => {
    const cx = padL + slot * i + slot / 2;
    const hi = ih * (s.income / max), hs = ih * (s.spent / max);
    out += '<rect x="' + (cx - bw - 2) + '" y="' + (padT + ih - hi) + '" width="' + bw + '" height="' + hi + '" rx="3" fill="#0e6b5c"/>';
    out += '<rect x="' + (cx + 2) + '" y="' + (padT + ih - hs) + '" width="' + bw + '" height="' + hs + '" rx="3" fill="#e8a13d"/>';
    const ny = padT + ih - ih * (Math.max(0, s.net) / max);
    out += '<circle cx="' + cx + '" cy="' + ny + '" r="3.5" fill="#16232c"/>';
    out += '<text x="' + cx + '" y="' + (h - 8) + '" font-size="11" fill="#41525e" text-anchor="middle">' + shortMonth(s.month) + '</text>';
  });
  out += '</svg>';
  out += '<div style="display:flex;gap:16px;font-size:12px;color:#41525e;margin-top:2px">'
    + '<span><span class="cat-dot" style="background:#0e6b5c"></span>Income</span>'
    + '<span><span class="cat-dot" style="background:#e8a13d"></span>Spending</span>'
    + '<span><span class="cat-dot" style="background:#16232c;border-radius:50%"></span>Kept (income − spending)</span></div>';
  return out;
}

// Donut of category shares with the month total in the middle.
export function donutChart(rows, colors, size) {
  const s = size || 190, r = s / 2 - 8, cx = s / 2, cy = s / 2, thick = 26;
  const total = rows.reduce((sum, x) => sum + x.total, 0) || 1;
  let angle = -Math.PI / 2, out = svgOpen(s, s, 'Spending by category');
  for (const row of rows) {
    const frac = row.total / total, a2 = angle + frac * Math.PI * 2;
    const large = frac > 0.5 ? 1 : 0;
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    out += '<path d="M ' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1)
      + '" fill="none" stroke="' + (colors[row.category] || '#999') + '" stroke-width="' + thick + '"/>';
    angle = a2;
  }
  out += '<text x="' + cx + '" y="' + (cy - 2) + '" font-size="19" font-weight="700" fill="#16232c" text-anchor="middle">' + fmt0(total) + '</text>';
  out += '<text x="' + cx + '" y="' + (cy + 16) + '" font-size="11" fill="#75858f" text-anchor="middle">spent</text>';
  return out + '</svg>';
}

// Net-worth area line over month-end snapshots.
export function netWorthChart(points) {
  const w = 640, h = 210, padL = 52, padB = 26, padT = 16;
  const vals = points.map((p) => p.value);
  const min = Math.min(...vals) * 0.97, max = Math.max(...vals) * 1.02;
  const iw = w - padL - 12, ih = h - padB - padT;
  const x = (i) => padL + (iw * i) / (points.length - 1);
  const y = (v) => padT + ih * (1 - (v - min) / (max - min));
  let out = svgOpen(w, h, 'Net worth trend');
  for (const frac of [0, 0.5, 1]) {
    const yy = padT + ih * (1 - frac);
    out += '<line x1="' + padL + '" y1="' + yy + '" x2="' + (w - 12) + '" y2="' + yy + '" stroke="#e3dac7"/>';
    out += '<text x="' + (padL - 6) + '" y="' + (yy + 4) + '" font-size="10" fill="#75858f" text-anchor="end">' + fmt0(min + (max - min) * frac) + '</text>';
  }
  const line = points.map((p, i) => x(i).toFixed(1) + ',' + y(p.value).toFixed(1)).join(' ');
  out += '<polygon points="' + padL + ',' + (padT + ih) + ' ' + line + ' ' + x(points.length - 1) + ',' + (padT + ih) + '" fill="rgba(14,107,92,.14)"/>';
  out += '<polyline points="' + line + '" fill="none" stroke="#0e6b5c" stroke-width="2.5"/>';
  points.forEach((p, i) => {
    out += '<circle cx="' + x(i) + '" cy="' + y(p.value) + '" r="3.5" fill="#0e6b5c"/>';
    out += '<text x="' + x(i) + '" y="' + (h - 8) + '" font-size="11" fill="#41525e" text-anchor="middle">' + shortMonth(p.month) + '</text>';
  });
  const last = points[points.length - 1];
  out += '<text x="' + x(points.length - 1) + '" y="' + (y(last.value) - 10) + '" font-size="13" font-weight="700" fill="#0a4f43" text-anchor="end">' + fmt0(last.value) + '</text>';
  return out + '</svg>';
}

// Budget progress bar with pace marker: the tick shows where spending
// "should" be today if it were spread evenly across the month.
export function budgetBar(used, limit, paceFrac) {
  const frac = limit > 0 ? used / limit : 0;
  const cls = frac > 1 ? 'over' : frac >= 0.8 ? 'near' : '';
  const pctW = Math.min(100, frac * 100);
  let marker = '';
  if (paceFrac != null && paceFrac > 0 && paceFrac < 1) {
    marker = '<div title="Even-pace marker" style="position:absolute;top:-3px;bottom:-3px;left:' + (paceFrac * 100).toFixed(1) + '%;width:2px;background:#16232c;opacity:.55"></div>';
  }
  return '<div class="progress" style="position:relative"><div class="' + cls + '" style="width:' + pctW.toFixed(1) + '%"></div>' + marker + '</div>';
}

// Goal progress ring (SVG circle stroke).
export function goalRing(saved, target, size) {
  const s = size || 84, r = s / 2 - 7, c = 2 * Math.PI * r;
  const frac = target > 0 ? Math.min(1, saved / target) : 0;
  return '<svg viewBox="0 0 ' + s + ' ' + s + '" width="' + s + '" height="' + s + '" role="img" aria-label="Goal ' + Math.round(frac * 100) + '% funded">'
    + '<circle cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" fill="none" stroke="#efe8d8" stroke-width="9"/>'
    + '<circle cx="' + s / 2 + '" cy="' + s / 2 + '" r="' + r + '" fill="none" stroke="#0e6b5c" stroke-width="9" stroke-linecap="round"'
    + ' stroke-dasharray="' + (c * frac).toFixed(1) + ' ' + c.toFixed(1) + '" transform="rotate(-90 ' + s / 2 + ' ' + s / 2 + ')"/>'
    + '<text x="' + s / 2 + '" y="' + (s / 2 + 5) + '" font-size="16" font-weight="700" fill="#16232c" text-anchor="middle">' + Math.round(frac * 100) + '%</text></svg>';
}

// Weekday average-spend bars (Mon..Sun).
export function weekdayChart(pattern) {
  const w = 460, h = 170, padB = 24, padT = 12;
  const max = Math.max(10, ...pattern.map((p) => p.avg)) * 1.15;
  const iw = w - 16, ih = h - padB - padT, slot = iw / 7, bw = Math.min(38, slot * 0.62);
  let out = svgOpen(w, h, 'Average spending by weekday');
  pattern.forEach((p, i) => {
    const cx = 8 + slot * i + slot / 2;
    const bh = ih * (p.avg / max);
    const weekend = i >= 5;
    out += '<rect x="' + (cx - bw / 2) + '" y="' + (padT + ih - bh) + '" width="' + bw + '" height="' + bh + '" rx="4" fill="' + (weekend ? '#e8a13d' : '#0e6b5c') + '"/>';
    out += '<text x="' + cx + '" y="' + (h - 7) + '" font-size="11" fill="#41525e" text-anchor="middle">' + p.day + '</text>';
    out += '<text x="' + cx + '" y="' + (padT + ih - bh - 5) + '" font-size="10.5" fill="#16232c" text-anchor="middle">' + fmt0(p.avg) + '</text>';
  });
  return out + '</svg>';
}

// Tiny sparkline for KPI cards.
export function sparkline(values, color) {
  const w = 150, h = 38;
  if (values.length < 2) return '';
  const min = Math.min(...values), max = Math.max(...values), span = (max - min) || 1;
  const pts = values.map((v, i) => (4 + (w - 8) * i / (values.length - 1)).toFixed(1) + ',' + (h - 4 - (h - 10) * (v - min) / span).toFixed(1)).join(' ');
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '" aria-hidden="true"><polyline points="' + pts + '" fill="none" stroke="' + (color || '#0e6b5c') + '" stroke-width="2"/></svg>';
}
