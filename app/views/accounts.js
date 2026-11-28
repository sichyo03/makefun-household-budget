// Accounts & net worth: live balances per account (opening figure plus
// every transaction on it), the net-worth trend chart, and an allocation
// bar. The trend chart and its month-end series live here — this is
// their only consumer, so they stay out of the first load.
import { ACCOUNTS, TODAY } from '../seed.js';
import { esc, fmt, fmt0, pct, shortMonth } from '../format.js';
import { getState } from '../store.js';
import { accountBalances, monthOf, monthsAvailable, prevMonth } from '../stats.js';
import { svgOpen } from '../charts.js';
import { kpiCard } from './shared.js';

// Month-end net worth computed live from the ledger: the opening
// balances (the month before the first transaction) plus every
// transaction up to each month-end. The series therefore always ends
// at the balances total above — add or edit a transaction and the
// trend moves with the balances, instead of repeating fixed snapshots.
function netWorthSeries() {
  const txs = getState().transactions;
  const opening = ACCOUNTS.reduce((s, a) => s + a.opening, 0);
  const months = monthsAvailable();
  const first = months.length ? months[0] : monthOf(TODAY);
  const points = [{ month: prevMonth(first), value: opening }];
  for (const m of (months.length ? months : [first])) {
    const delta = txs.filter((t) => monthOf(t.date) <= m).reduce((s, t) => s + t.amount, 0);
    points.push({ month: m, value: opening + delta });
  }
  return points;
}

// Net-worth area line over month-end snapshots.
function netWorthChart(points) {
  const w = 640, h = 196, padL = 52, padB = 24, padT = 16;
  const vals = points.map((p) => p.value);
  // Whole-thousand axis bounds so labels read $18,000 / $24,000 / $30,000.
  const min = Math.floor(Math.min(...vals) * 0.97 / 1000) * 1000;
  const max = Math.ceil(Math.max(...vals) * 1.02 / 1000) * 1000;
  const iw = w - padL - 12, ih = h - padB - padT;
  const x = (i) => padL + (iw * i) / (points.length - 1);
  const y = (v) => padT + ih * (1 - (v - min) / (max - min));
  let out = svgOpen(w, h, 'Net worth trend');
  for (const frac of [0, 0.5, 1]) {
    const yy = padT + ih * (1 - frac);
    out += `<line x1="${padL}" y1="${yy}" x2="${w - 12}" y2="${yy}" stroke="#e3dac7"/>`;
    out += `<text x="${padL - 6}" y="${yy + 4}" font-size="10" fill="#75858f" text-anchor="end">${fmt0(min + (max - min) * frac)}</text>`;
  }
  const line = points.map((p, i) => `${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  out += `<polygon points="${padL},${padT + ih} ${line} ${x(points.length - 1)},${padT + ih}" fill="rgba(14,107,92,.14)"/>`;
  out += `<polyline points="${line}" fill="none" stroke="#0e6b5c" stroke-width="2.5"/>`;
  points.forEach((p, i) => {
    out += `<circle cx="${x(i)}" cy="${y(p.value)}" r="3.5" fill="#0e6b5c"/>`;
    out += `<text x="${x(i)}" y="${h - 7}" font-size="11" fill="#41525e" text-anchor="middle">${shortMonth(p.month)}</text>`;
  });
  const last = points[points.length - 1];
  out += `<text x="${x(points.length - 1)}" y="${y(last.value) - 10}" font-size="13" font-weight="700" fill="#0a4f43" text-anchor="end">${fmt0(last.value)}</text>`;
  return `${out}</svg>`;
}

const ALLOC_COLORS = ['#0e6b5c', '#e8a13d', '#3e6fa3', '#7a5c9e', '#90a955'];

export function accountsView() {
  const state = getState();
  const balances = accountBalances();
  const total = balances.reduce((s, a) => s + a.balance, 0);
  const assets = balances.filter((a) => a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const debts = -balances.filter((a) => a.balance < 0).reduce((s, a) => s + a.balance, 0);
  const nw = netWorthSeries();
  const growth = nw.length > 1 ? nw[nw.length - 1].value - nw[0].value : 0;
  // fmt0 already carries the minus sign, so only a positive growth
  // gets an explicit "+" — never "+-$4,507".
  const growthText = growth >= 0 ? `+${fmt0(growth)}` : fmt0(growth);
  const alloc = balances.filter((a) => a.balance > 0);
  // Average monthly contribution into invested accounts, computed from
  // the ledger (total paid in ÷ months on record) — not a fixed figure.
  const investIds = new Set(balances.filter((a) => a.kind === 'invest').map((a) => a.id));
  const contributed = state.transactions.filter((t) => investIds.has(t.account) && t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const investPerMonth = contributed / Math.max(1, monthsAvailable().length);
  const txCount = (id) => state.transactions.filter((t) => t.account === id).length;

  return `<div class="grid kpis">
    ${kpiCard('Net worth', fmt0(total), `Assets ${fmt0(assets)} − debts ${fmt0(debts)}`)}
    ${kpiCard(`Growth since ${shortMonth(nw[0].month)}`, growthText, `From ${fmt0(nw[0].value)} to ${fmt0(nw[nw.length - 1].value)}`, growth >= 0 ? 'pos' : 'neg')}
    ${kpiCard('Liquid cash', fmt0(balances.filter((a) => a.kind === 'bank' || a.kind === 'cash').reduce((s, a) => s + a.balance, 0)), 'Checking + savings + envelope')}
    ${kpiCard('Invested', fmt0(balances.filter((a) => a.kind === 'invest').reduce((s, a) => s + a.balance, 0)), investPerMonth > 0 ? `Index funds, ~${fmt0(investPerMonth)}/mo` : 'Index funds')}
  </div>
  <section class="card section-gap"><div class="card-head"><h2>Net-worth trend</h2><span class="chip">${growthText} in ${nw.length - 1} month${nw.length - 1 === 1 ? '' : 's'}</span></div>
  ${netWorthChart(nw)}</section>
  <div class="split-even section-gap"><section class="card"><div class="card-head"><h2>Account balances</h2></div>
  <div class="list-rows">${balances.map((a) => `<div class="list-row"><div class="grow"><div class="title">${esc(a.label)}</div><div class="sub">Opened at ${fmt(a.opening)} &middot; ${txCount(a.id)} transaction${txCount(a.id) === 1 ? '' : 's'}</div></div><b class="${a.balance < 0 ? 'neg' : ''}">${fmt(a.balance)}</b></div>`).join('')}</div></section>
  <section class="card"><div class="card-head"><h2>Where the money sits</h2></div>
  ${alloc.length ? `<div class="alloc-bar">${alloc.map((a, i) => `<div style="width:${(assets ? (a.balance / assets * 100).toFixed(1) : 0)}%;background:${ALLOC_COLORS[i % 5]}"></div>`).join('')}</div>
  <div class="legend alloc-legend">${alloc.map((a, i) => `<div class="row"><span class="cat-dot" style="background:${ALLOC_COLORS[i % 5]}"></span>${esc(a.label)}<span class="amt">${fmt0(a.balance)}</span><span class="pct">${pct(assets ? a.balance / assets : 0)}</span></div>`).join('')}</div>` : '<p class="empty-note">No account has a positive balance right now.</p>'}
  <p class="empty-note">Balances are the opening figure plus every transaction on that account — add or edit a transaction and they move.</p></section></div>`;
}
