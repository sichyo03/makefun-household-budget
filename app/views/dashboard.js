// Dashboard: the month at a glance. KPI cards, a live data-counts strip,
// compact attention cards (over-budget categories, unusual spends), the
// cash-flow and category charts, then budget health, bills due soon, top
// goals and the latest activity. Every figure is computed from the ledger.
import { ACCOUNTS, TODAY } from '../seed.js';
import { esc, fmt, fmt0, monthLabel, pct, shortMonth } from '../format.js';
import { getState } from '../store.js';
import {
  anomalies, cashFlowSeries, categoryOf, monthTotals, monthTransactions,
  monthsAvailable, netWorthNow, spendingByCategory, upcomingBills,
} from '../stats.js';
import { budgetBar, cashFlowChart, donutChart, goalRing } from '../charts.js';
import { COLORS, daysInMonth, kpiCard, monthPhase, paceFrac, txRow } from './shared.js';

export function dashboardView() {
  const state = getState(), month = state.month;
  const t = monthTotals(month);
  const monthCount = monthsAvailable().length;
  const cats = spendingByCategory(month);
  const series = cashFlowSeries();
  const dueSoon = upcomingBills(14);
  const pace = paceFrac(month);
  // Safe to spend is what is actually left after spending *and* the
  // savings sweep (already moved out of checking on the 24th), spread
  // over the days remaining — not income minus spending alone.
  const safePerDay = pace ? Math.max(0, t.net) / Math.max(1, daysInMonth(month) - Number(TODAY.slice(8, 10))) : 0;
  const spendCount = monthTransactions(month).filter((x) => x.amount < 0 && x.category !== 'savings' && x.category !== 'transfer').length;
  // `!= null`, not truthy: a $0 limit is a real budget, and any spend
  // against it is over — the same rule the nav badge uses.
  const over = cats.filter((c) => state.budgets[c.category] != null && c.total > state.budgets[c.category]);
  // "Past 80%" only warns for day-to-day categories; a category made
  // entirely of recurring charges (rent, subscriptions) is fully posted
  // and cannot drift further, so it is not counted as near the limit.
  const monthTxs = monthTransactions(month);
  const isFixed = (cat) => {
    const txs = monthTxs.filter((t) => t.category === cat && t.amount < 0);
    return txs.length > 0 && txs.every((t) => t.recurring);
  };
  const near = cats.filter((c) => state.budgets[c.category] && c.total <= state.budgets[c.category] && c.total >= state.budgets[c.category] * 0.8 && !isFixed(c.category));
  const recent = state.transactions.slice(-8).reverse();
  const topGoals = state.goals.slice().sort((a, b) => (b.saved / b.target) - (a.saved / a.target)).slice(0, 3);
  const anomsAll = anomalies(month);
  const anoms = anomsAll.slice(0, 2);
  // Legend shows the top 7 categories; the rest collapse into one row so
  // the legend still adds up to the donut's spent total.
  const restCats = cats.slice(7);
  const restTotal = restCats.reduce((s, c) => s + c.total, 0);
  // Income sublabel names the month's actual income sources from the
  // ledger (grouped by description, biggest first), so editing or
  // deleting a salary moves the label with the total instead of
  // repeating fixed seed figures.
  const incByDesc = new Map();
  for (const x of monthTransactions(month)) {
    if (x.category === 'income') incByDesc.set(x.desc, (incByDesc.get(x.desc) || 0) + x.amount);
  }
  const incShown = [...incByDesc.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 2);
  const incRest = t.income - incShown.reduce((s, [, v]) => s + v, 0);
  const incLabel = (d) => esc(d.replace(/^Salary — /, '').replace(/ \([^)]*\)$/, ''));
  const incParts = incShown.map(([d, v]) => `${incLabel(d)} ${fmt0(v)}`);
  if (incRest > 0.5) incParts.push(`${fmt0(incRest)} other income`);
  const incomeSub = incParts.length ? incParts.join(' + ') : 'No income recorded';

  let html = `<div class="grid kpis">
    ${kpiCard(`Income — ${shortMonth(month)}`, fmt0(t.income), incomeSub)}
    ${kpiCard('Spent', fmt0(t.spent), `${cats.length} categor${cats.length === 1 ? 'y' : 'ies'} &middot; ${spendCount} expense${spendCount === 1 ? '' : 's'}`)}
    ${kpiCard('Kept this month', fmt0(t.income - t.spent), t.savingsRate == null ? 'No income recorded' : `Savings rate ${pct(t.savingsRate)} of income`, t.income - t.spent >= 0 ? 'pos' : 'neg')}
    ${kpiCard('Safe to spend / day', pace ? fmt0(safePerDay) : '—', pace ? `For the rest of ${monthLabel(month)}` : monthPhase(month) === 'future' ? 'Month not started' : 'Month closed')}
    ${kpiCard('Net worth', fmt0(netWorthNow()), `Across ${ACCOUNTS.length} accounts`)}
  </div>
  <p class="counts-strip">${state.transactions.length} transaction${state.transactions.length === 1 ? '' : 's'} &middot; ${monthCount} month${monthCount === 1 ? '' : 's'} &middot; ${ACCOUNTS.length} account${ACCOUNTS.length === 1 ? '' : 's'} &middot; ${state.bills.length} bill${state.bills.length === 1 ? '' : 's'} tracked &middot; ${state.goals.length} goal${state.goals.length === 1 ? '' : 's'} — every figure below is computed live from the ledger.</p>`;

  if (over.length || anoms.length) {
    html += `<div class="split-even section-gap">`;
    if (over.length) {
      html += `<section class="card alert-card bad"><div class="card-head"><h3>&#9888; Over budget — ${over.length} categor${over.length === 1 ? 'y' : 'ies'}</h3><a href="#/budget">Planner &rarr;</a></div>`
        + over.map((c) => `<div class="alert-row"><span><b>${esc(categoryOf(c.category).label)}</b> — ${fmt(c.total)} spent of ${fmt0(state.budgets[c.category])} planned</span><span class="delta neg">+${fmt0(c.total - state.budgets[c.category])}</span></div>`).join('')
        + `</section>`;
    }
    if (anoms.length) {
      html += `<section class="card alert-card warn"><div class="card-head"><h3>&#9673; Unusual spends — ${anomsAll.length}</h3><a href="#/insights">Insights &rarr;</a></div>`
        + anoms.map((a) => `<div class="alert-row"><span><b>${esc(a.tx.desc)}</b> — ${a.ratio.toFixed(1)}&times; the usual ${esc(categoryOf(a.tx.category).label)} ticket</span><span class="delta">${fmt(-a.tx.amount)}</span></div>`).join('')
        + `</section>`;
    }
    html += `</div>`;
  }

  html += `<div class="split section-gap">
    <section class="card"><div class="card-head"><h2>Cash flow${series.length ? ` — last ${series.length} month${series.length === 1 ? '' : 's'}` : ''}</h2><a href="#/insights">Insights &rarr;</a></div>
    <p class="card-sub">Income vs spending each month; the dot is what the household kept.</p>${series.length ? cashFlowChart(series) : '<p class="empty-note">No transactions yet — the chart appears once the ledger has entries.</p>'}</section>
    <section class="card"><div class="card-head"><h2>Where it went — ${monthLabel(month)}</h2></div>
    <div class="chart-flex"><div class="donut-wrap">${donutChart(cats, COLORS, 120)}</div><div class="legend">
    ${cats.length ? '' : '<p class="empty-note">No spending this month yet.</p>'}
    ${cats.slice(0, 7).map((c) => `<div class="row"><span class="cat-dot" style="background:${COLORS[c.category]}"></span>${esc(categoryOf(c.category).label)}<span class="amt">${fmt0(c.total)}</span><span class="pct">${pct(t.spent ? c.total / t.spent : 0)}</span></div>`).join('')}
    ${restCats.length ? `<div class="row"><span class="cat-dot" style="background:#b9b0a0"></span>+ ${restCats.length} more<span class="amt">${fmt0(restTotal)}</span><span class="pct">${pct(t.spent ? restTotal / t.spent : 0)}</span></div>` : ''}
    </div></div></section></div>`;

  html += `<div class="grid cols-3 section-gap">
    <section class="card"><div class="card-head"><h3>Budget health</h3><a href="#/budget">Planner &rarr;</a></div>
    ${cats.length ? '' : '<p class="empty-note">No spending recorded this month yet.</p>'}
    ${cats.slice(0, 5).map((c) => {
      const limit = state.budgets[c.category] || 0;
      return `<div class="health-row"><div class="health-line"><span><span class="cat-dot" style="background:${COLORS[c.category]}"></span>${esc(categoryOf(c.category).label)}</span><b>${fmt0(c.total)} / ${fmt0(limit)}</b></div>${budgetBar(c.total, limit, pace)}</div>`;
    }).join('')}
    ${near.length ? `<p class="card-sub near-note">${near.length} categor${near.length === 1 ? 'y is' : 'ies are'} past 80% of budget.</p>` : ''}
    </section>
    <section class="card"><div class="card-head"><h3>Bills due in 14 days</h3><a href="#/bills">Calendar &rarr;</a></div>
    ${dueSoon.length ? `<div class="list-rows">${dueSoon.slice(0, 3).map((b) => `<div class="list-row"><div class="grow"><div class="title">${esc(b.name)}</div><div class="sub">${b.overdue ? `Overdue — due ${b.date}` : `Due ${b.date}`}${b.autopay ? ' &middot; autopay' : ' &middot; manual'}</div></div><b>${fmt(b.amount)}${b.estimated ? ' <span class="chip grey">est.</span>' : ''}</b></div>`).join('')}</div>${dueSoon.length > 3 ? `<p class="card-sub">${dueSoon.length - 3} more due soon — see the calendar.</p>` : ''}`
      : `<p class="empty-note">Nothing due in the next two weeks — all clear.</p>`}
    </section>
    <section class="card"><div class="card-head"><h3>Top goals</h3><a href="#/goals">All goals &rarr;</a></div>
    ${topGoals.length ? topGoals.map((g) => `<div class="list-row">${goalRing(g.saved, g.target, 56)}<div class="grow"><div class="title">${esc(g.name)}</div><div class="sub">${fmt0(g.saved)} of ${fmt0(g.target)} &middot; by ${g.by}</div></div></div>`).join('') : '<p class="empty-note">No goals yet — start one from Savings goals.</p>'}
    </section></div>`;

  html += `<section class="card section-gap"><div class="card-head"><h2>Latest activity</h2><a href="#/transactions">All ${state.transactions.length} transaction${state.transactions.length === 1 ? '' : 's'} &rarr;</a></div>
    ${recent.length ? `<table><thead><tr><th>Description</th><th>Category</th><th class="num">Amount</th></tr></thead><tbody>
    ${recent.map((x) => txRow(x)).join('')}</tbody></table>` : '<p class="empty-note">No transactions yet — add the first one from Transactions.</p>'}</section>`;
  return html;
}
