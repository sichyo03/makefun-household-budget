// Insights: savings-rate trend, month-over-month movers, unusual spends,
// the subscription & bill audit, top merchants, and the weekday spending
// pattern. The weekday chart, sparkline and the three figures only this
// page shows (movers, top merchants, weekday pattern) live here — this
// is their only consumer, so they stay out of the first load.
import { esc, fmt, fmt0, monthLabel, pct, shortMonth } from '../format.js';
import { getState } from '../store.js';
import {
  anomalies, cashFlowSeries, categoryOf, monthTotals, monthTransactions,
  monthsAvailable, prevMonth, recurringMerchants, spendingByCategory,
} from '../stats.js';
import { svgOpen } from '../charts.js';
import { COLORS, kpiCard } from './shared.js';

// Biggest category movers vs the previous month on record, absolute
// dollars first. The comparison month is the last month that still has
// transactions, not the calendar month before: if October's rows are
// deleted, November compares against September (as the label below
// says) instead of against an empty October where every category
// would read "$0 → $X (new)".
function monthMovers(month) {
  const avail = monthsAvailable();
  const idx = avail.indexOf(month);
  const prev = idx > 0 ? avail[idx - 1] : prevMonth(month);
  const now = new Map(spendingByCategory(month).map((r) => [r.category, r.total]));
  const before = new Map(spendingByCategory(prev).map((r) => [r.category, r.total]));
  return [...new Set([...now.keys(), ...before.keys()])]
    .map((category) => {
      const cur = now.get(category) || 0, old = before.get(category) || 0;
      // No previous-month base means no percent exists: a category that
      // starts spending this month is "new", not "+100%".
      return { category, cur, old, delta: cur - old, pct: old > 0 ? (cur - old) / old : (cur > 0 ? null : 0) };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function topMerchants(month, limit = 6) {
  const map = new Map();
  for (const t of monthTransactions(month)) {
    if (t.amount >= 0 || t.category === 'savings' || t.category === 'transfer') continue;
    const r = map.get(t.desc) || { desc: t.desc, category: t.category, total: 0, count: 0 };
    r.total += -t.amount; r.count += 1; map.set(t.desc, r);
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

// Average spend per weekday (Mon..Sun) across all history: each
// weekday's total divided by how many times that weekday occurs in
// the ledger's date range — what a typical Wednesday costs, not the
// size of a typical Wednesday purchase.
function weekdayPattern() {
  const sums = Array(7).fill(0);
  let first = null, last = null;
  for (const t of getState().transactions) {
    if (t.amount >= 0 || t.category === 'savings' || t.category === 'transfer') continue;
    const dow = (new Date(`${t.date}T12:00:00`).getDay() + 6) % 7; // Mon=0
    sums[dow] += -t.amount;
    if (!first || t.date < first) first = t.date;
    if (!last || t.date > last) last = t.date;
  }
  const occurrences = Array(7).fill(0);
  if (first) {
    for (let d = new Date(`${first}T12:00:00`); d <= new Date(`${last}T12:00:00`); d.setDate(d.getDate() + 1)) {
      occurrences[(d.getDay() + 6) % 7] += 1;
    }
  }
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return sums.map((s, i) => ({ day: names[i], avg: occurrences[i] ? s / occurrences[i] : 0, total: s }));
}

// Average-spend bars by weekday (Mon..Sun), weekends in amber.
function weekdayChart(pattern) {
  const w = 460, h = 158, padB = 24, padT = 12;
  const max = Math.max(10, ...pattern.map((p) => p.avg)) * 1.15;
  const iw = w - 16, ih = h - padB - padT, slot = iw / 7, bw = Math.min(38, slot * 0.62);
  let out = svgOpen(w, h, 'Average spending by weekday');
  pattern.forEach((p, i) => {
    const cx = 8 + slot * i + slot / 2;
    const bh = ih * (p.avg / max);
    out += `<rect x="${cx - bw / 2}" y="${padT + ih - bh}" width="${bw}" height="${bh}" rx="4" fill="${i >= 5 ? '#e8a13d' : '#0e6b5c'}"/>`;
    out += `<text x="${cx}" y="${h - 7}" font-size="11" fill="#41525e" text-anchor="middle">${p.day}</text>`;
    out += `<text x="${cx}" y="${padT + ih - bh - 5}" font-size="10.5" fill="#16232c" text-anchor="middle">${fmt0(p.avg)}</text>`;
  });
  return `${out}</svg>`;
}

// Tiny trend line for the savings-rate KPI card.
function sparkline(values, color = '#0e6b5c') {
  const w = 150, h = 38;
  if (values.length < 2) return '';
  const min = Math.min(...values), max = Math.max(...values), span = (max - min) || 1;
  const pts = values.map((v, i) => `${(4 + (w - 8) * i / (values.length - 1)).toFixed(1)},${(h - 4 - (h - 10) * (v - min) / span).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2"/></svg>`;
}

export function insightsView() {
  const state = getState(), month = state.month;
  const movers = monthMovers(month);
  const anoms = anomalies(month);
  const subs = recurringMerchants().filter((r) => r.category === 'subscriptions' || r.category === 'utilities');
  const subTotal = subs.reduce((s, r) => s + r.typical, 0);
  // Yearly figure sums the audit table's own per-year column (each row
  // rounded as displayed), so the KPI card and the table below it
  // always reconcile to the dollar.
  const subYearly = subs.reduce((s, r) => s + Math.round(r.yearly), 0);
  // The footer sentence is about subscriptions, so it sums the two
  // smallest subscription rows only — not whatever rows happen to sit
  // at the bottom of the mixed bills-and-subs table.
  const subOnly = subs.filter((r) => r.category === 'subscriptions');
  const merchants = topMerchants(month, 6);
  // The trend plots months that have income: a spend-only month has no
  // savings rate, and plotting it as 0% would claim the household broke
  // even. `series` still counts every month on record for the labels.
  const series = cashFlowSeries();
  const rates = series.filter((s) => s.income > 0).map((s) => (s.income - s.spent) / s.income);
  const monthRate = monthTotals(month).savingsRate;
  const weekday = weekdayPattern();
  const busiest = weekday.slice().sort((a, b) => b.avg - a.avg)[0];
  // The first month on record has no previous month: movers would
  // compare against an empty May and claim every category is +100%.
  const monthIdx = monthsAvailable().indexOf(month);
  const isFirstMonth = monthIdx <= 0;
  const prevLabel = isFirstMonth ? '' : monthLabel(monthsAvailable()[monthIdx - 1]);

  let html = `<div class="grid kpis">
    ${kpiCard(`Savings rate — ${shortMonth(month)}`, monthRate == null ? '—' : pct(monthRate), rates.length > 1 ? `${rates.length}-month trend ${sparkline(rates)}` : series.length === 0 ? 'No months on record yet' : rates.length === 0 ? 'No income recorded yet' : series.length === 1 ? 'First month on record' : 'Trend needs 2 months with income')}
    ${kpiCard('Recurring bills & subs', `${fmt0(subTotal)}<span class="kpi-unit">/mo</span>`, `${subs.length} detected &middot; ${fmt0(subYearly)} a year`)}
    ${kpiCard('Unusual spends', String(anoms.length), 'Tickets 2&times;+ the category norm')}
    ${kpiCard('Biggest spend day', busiest.avg > 0 ? busiest.day : '—', busiest.avg > 0 ? `Averages ${fmt0(busiest.avg)} per ${busiest.day}` : 'No spending recorded yet')}
  </div>`;

  html += `<div class="split-even section-gap">
    <section class="card"><div class="card-head"><h2>Month-over-month movers</h2></div>
    ${isFirstMonth
      ? (movers.length
        ? `<p class="card-sub">${monthLabel(month)} is the first month on record — movers start next month. Biggest categories this month:</p>
    ${movers.slice().sort((a, b) => b.cur - a.cur).slice(0, 8).map((m) => `<div class="mover"><span class="cat-dot" style="background:${COLORS[m.category]}"></span><div class="grow"><b>${esc(categoryOf(m.category).label)}</b><div class="mover-sub">first month on record</div></div>
      <b>${fmt0(m.cur)}</b></div>`).join('')}`
        : '<p class="empty-note">No spending on record yet — movers appear once expenses are recorded.</p>')
      : `<p class="card-sub">vs ${prevLabel}, biggest dollar swings first.</p>
    ${movers.length ? movers.slice(0, 8).map((m) => `<div class="mover"><span class="cat-dot" style="background:${COLORS[m.category]}"></span><div class="grow"><b>${esc(categoryOf(m.category).label)}</b><div class="mover-sub">${fmt0(m.old)} &rarr; ${fmt0(m.cur)}</div></div>
      <span class="delta ${m.delta > 0 ? 'neg' : 'pos'}">${m.delta > 0 ? '+' : ''}${fmt0(m.delta)} (${m.pct === null ? 'new' : `${m.delta > 0 ? '+' : ''}${pct(m.pct)}`})</span></div>`).join('')
      : '<p class="empty-note">No spending in either month yet — movers appear once expenses are recorded.</p>'}`}
    </section>
    <section class="card"><div class="card-head"><h2>Unusual spends — ${monthLabel(month)}</h2></div>
    <p class="card-sub">Expenses at least twice their category&rsquo;s usual ticket.</p>
    ${anoms.length ? anoms.map((a) => `<div class="mover"><div class="grow"><b>${esc(a.tx.desc)}</b><div class="mover-sub">${a.tx.date} &middot; usual ${esc(categoryOf(a.tx.category).label)} ticket ${fmt0(a.median)}</div></div><span class="delta neg">${fmt(-a.tx.amount)} &middot; ${a.ratio.toFixed(1)}&times;</span></div>`).join('')
      : '<p class="empty-note">Nothing unusual this month — spending is in line with each category&rsquo;s norm.</p>'}
    <h3 class="card-subhead">Average spend by weekday</h3><p class="card-sub">All history; weekends in amber.</p>${weekdayChart(weekday)}
    </section></div>`;

  html += `<div class="split-even section-gap">
    <section class="card"><div class="card-head"><h2>Subscription &amp; bill audit</h2></div>
    <p class="card-sub">Detected from repeat charges across months. Yearly cost at the typical amount.</p>
    ${subs.length ? `<table><thead><tr><th>Charge</th><th class="num">Typical</th><th class="num">Per year</th><th class="num">Months seen</th></tr></thead><tbody>
    ${subs.map((r) => `<tr><td><span class="cat-dot" style="background:${COLORS[r.category]}"></span>${esc(r.desc)}</td><td class="num">${fmt(r.typical)}</td><td class="num">${fmt0(r.yearly)}</td><td class="num">${r.months}</td></tr>`).join('')}
    </tbody></table>` : '<p class="empty-note">No recurring charges detected yet — a charge repeating across 3+ months appears here.</p>'}${subOnly.length ? `<p class="empty-note">Cancelling the ${subOnly.length === 1 ? 'smallest subscription' : 'two smallest subscriptions'} would free about ${fmt0(subOnly.slice(-2).reduce((s, r) => s + r.yearly, 0))} a year.</p>` : ''}</section>
    <section class="card"><div class="card-head"><h2>Top merchants — ${monthLabel(month)}</h2></div>
    ${merchants.length ? merchants.map((m) => `<div class="mover"><div class="grow"><b>${esc(m.desc)}</b><div class="mover-sub">${m.count} visit${m.count === 1 ? '' : 's'} &middot; ${esc(categoryOf(m.category).label)}</div></div><b>${fmt0(m.total)}</b></div>`).join('')
      + '<p class="empty-note">Merchants ranked by total spend this month, across all accounts.</p>'
      : '<p class="empty-note">No spending this month yet — merchants appear once expenses are recorded.</p>'}
    </section></div>`;
  return html;
}
