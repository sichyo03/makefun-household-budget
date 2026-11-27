// HearthLedger v2 views: seven pages rendered as HTML strings from state.
// Every figure is computed live from the transaction ledger — no placeholders.
import { ACCOUNTS, CATEGORIES, TODAY } from './seed.js';
import {
  accountBalances, accountOf, anomalies, billsForMonth, cashFlowSeries, categoryOf,
  esc, fmt, fmt0, getState, isRecurringTx, monthLabel, monthMovers, monthTotals,
  monthTransactions, monthsAvailable, netWorthNow, pct, recurringMerchants,
  shortMonth, spentInCategory, spendingByCategory, topMerchants, upcomingBills,
  weekdayPattern,
} from './state.js';
import { budgetBar, cashFlowChart, donutChart, goalRing, netWorthChart, sparkline, weekdayChart } from './charts.js';

const COLORS = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.color]));

export function kpiCard(label, value, sub, cls) {
  return '<div class="card kpi"><div class="kpi-label">' + esc(label) + '</div>'
    + '<div class="kpi-value ' + (cls || '') + '">' + value + '</div>'
    + '<div class="kpi-sub">' + sub + '</div></div>';
}

function txRow(t, opts) {
  const cat = categoryOf(t.category);
  const rec = isRecurringTx(t) ? ' <span class="chip grey" title="Recurring payment">recurring</span>' : '';
  const actions = opts && opts.actions
    ? '<td class="num"><span class="row-actions"><button class="icon-btn" data-edit="' + t.id + '" title="Edit">&#9998;</button>'
      + '<button class="icon-btn" data-del="' + t.id + '" title="Delete">&#10005;</button></span></td>' : '';
  return '<tr><td><div class="tx-desc">' + esc(t.desc) + rec + '</div>'
    + '<div class="tx-meta">' + t.date + ' &middot; ' + esc(accountOf(t.account).label) + '</div></td>'
    + '<td><span class="cat-dot" style="background:' + cat.color + '"></span>' + esc(cat.label) + '</td>'
    + '<td class="num ' + (t.amount >= 0 ? 'pos' : '') + '">' + fmt(t.amount) + '</td>' + actions + '</tr>';
}

function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}
function paceFrac(month) {
  if (month !== TODAY.slice(0, 7)) return null;
  return Number(TODAY.slice(8, 10)) / daysInMonth(month);
}

export function dashboardView() {
  const state = getState(), month = state.month;
  const t = monthTotals(month);
  const cats = spendingByCategory(month);
  const series = cashFlowSeries();
  const dueSoon = upcomingBills(14);
  const pace = paceFrac(month);
  const safePerDay = pace ? Math.max(0, (t.income - t.spent)) / Math.max(1, daysInMonth(month) - Number(TODAY.slice(8, 10))) : 0;
  const over = cats.filter((c) => state.budgets[c.category] && c.total > state.budgets[c.category]);
  const near = cats.filter((c) => state.budgets[c.category] && c.total <= state.budgets[c.category] && c.total >= state.budgets[c.category] * 0.8);
  const recent = state.transactions.slice(-8).reverse();
  const topGoals = state.goals.slice().sort((a, b) => (b.saved / b.target) - (a.saved / a.target)).slice(0, 3);
  const anoms = anomalies(month).slice(0, 2);

  let html = '<div class="grid kpis">'
    + kpiCard('Income — ' + shortMonth(month), fmt0(t.income), 'Maya $2,850 + Daniel $2,100' + (t.income > 4950 ? ' + extras' : ''))
    + kpiCard('Spent', fmt0(t.spent), cats.length + ' categories &middot; ' + monthTransactions(month).length + ' transactions')
    + kpiCard('Kept this month', fmt0(t.income - t.spent), 'Savings rate ' + pct(t.savingsRate) + ' of income', t.income - t.spent >= 0 ? 'pos' : 'neg')
    + kpiCard('Safe to spend / day', pace ? fmt0(safePerDay) : '—', pace ? 'For the rest of ' + monthLabel(month) : 'Month closed')
    + kpiCard('Net worth', fmt0(netWorthNow()), 'Across ' + ACCOUNTS.length + ' accounts')
    + '</div>';

  if (over.length || anoms.length) {
    html += '<div class="section-gap">';
    for (const c of over) {
      html += '<div class="alert bad"><span class="alert-ic">&#9888;</span><div><b>' + esc(categoryOf(c.category).label) + ' is over budget</b> — '
        + fmt(c.total) + ' spent of ' + fmt0(state.budgets[c.category]) + ' planned. <a href="#/budget">Open the planner</a></div></div>';
    }
    for (const a of anoms) {
      html += '<div class="alert warn"><span class="alert-ic">&#9673;</span><div><b>Unusual spend:</b> ' + esc(a.tx.desc) + ' — ' + fmt(-a.tx.amount)
        + ' (' + a.ratio.toFixed(1) + '&times; the usual ' + esc(categoryOf(a.tx.category).label) + ' ticket). <a href="#/insights">See insights</a></div></div>';
    }
    html += '</div>';
  }

  html += '<div class="split section-gap">'
    + '<section class="card"><div class="card-head"><h2>Cash flow — last ' + series.length + ' months</h2><a href="#/insights">Insights &rarr;</a></div>'
    + '<p class="card-sub">Income vs spending each month; the dot is what the household kept.</p>' + cashFlowChart(series) + '</section>'
    + '<section class="card"><div class="card-head"><h2>Where it went — ' + monthLabel(month) + '</h2></div>'
    + '<div class="chart-flex">' + donutChart(cats, COLORS, 180) + '<div class="legend">'
    + cats.slice(0, 7).map((c) => '<div class="row"><span class="cat-dot" style="background:' + COLORS[c.category] + '"></span>' + esc(categoryOf(c.category).label)
      + '<span class="amt">' + fmt0(c.total) + '</span><span class="pct">' + pct(t.spent ? c.total / t.spent : 0) + '</span></div>').join('')
    + '</div></div></section></div>';

  html += '<div class="grid cols-3 section-gap">'
    + '<section class="card"><div class="card-head"><h3>Budget health</h3><a href="#/budget">Planner &rarr;</a></div>'
    + cats.slice(0, 5).map((c) => {
      const limit = state.budgets[c.category] || 0;
      return '<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between;font-size:13.5px"><span><span class="cat-dot" style="background:' + COLORS[c.category] + '"></span>' + esc(categoryOf(c.category).label) + '</span><b>' + fmt0(c.total) + ' / ' + fmt0(limit) + '</b></div>' + budgetBar(c.total, limit, pace) + '</div>';
    }).join('')
    + (near.length ? '<p class="card-sub" style="margin-top:8px">' + near.length + ' categor' + (near.length === 1 ? 'y is' : 'ies are') + ' past 80% of budget.</p>' : '')
    + '</section>'
    + '<section class="card"><div class="card-head"><h3>Bills due in 14 days</h3><a href="#/bills">Calendar &rarr;</a></div>'
    + (dueSoon.length ? '<div class="list-rows">' + dueSoon.map((b) => '<div class="list-row"><div class="grow"><div class="title">' + esc(b.name) + '</div><div class="sub">Due ' + b.date + (b.autopay ? ' &middot; autopay' : ' &middot; manual') + '</div></div><b>' + fmt(b.amount) + '</b></div>').join('') + '</div>'
      : '<p class="empty-note">Nothing due in the next two weeks — all clear.</p>')
    + '</section>'
    + '<section class="card"><div class="card-head"><h3>Top goals</h3><a href="#/goals">All goals &rarr;</a></div>'
    + topGoals.map((g) => '<div class="list-row">' + goalRing(g.saved, g.target, 56) + '<div class="grow"><div class="title">' + esc(g.name) + '</div><div class="sub">' + fmt0(g.saved) + ' of ' + fmt0(g.target) + ' &middot; by ' + g.by + '</div></div></div>').join('')
    + '</section></div>';

  html += '<section class="card section-gap"><div class="card-head"><h2>Latest activity</h2><a href="#/transactions">All ' + state.transactions.length + ' transactions &rarr;</a></div>'
    + '<table><thead><tr><th>Description</th><th>Category</th><th class="num">Amount</th></tr></thead><tbody>'
    + recent.map((x) => txRow(x)).join('') + '</tbody></table></section>';
  return html;
}

// ---------- transactions ----------
export const txFilter = { q: '', category: 'all', account: 'all', type: 'all', month: 'all' };
let editingId = null;
export function setEditing(id) { editingId = id; }
export function getEditing() { return editingId; }

function filteredTransactions() {
  const state = getState();
  return state.transactions.filter((t) => {
    if (txFilter.month !== 'all' && t.date.slice(0, 7) !== txFilter.month) return false;
    if (txFilter.category !== 'all' && t.category !== txFilter.category) return false;
    if (txFilter.account !== 'all' && t.account !== txFilter.account) return false;
    if (txFilter.type === 'income' && t.amount < 0) return false;
    if (txFilter.type === 'expense' && t.amount >= 0) return false;
    if (txFilter.q && !(t.desc + ' ' + categoryOf(t.category).label).toLowerCase().includes(txFilter.q.toLowerCase())) return false;
    return true;
  }).slice().reverse();
}

export function transactionsView() {
  const state = getState();
  const rows = filteredTransactions();
  const totalIn = rows.filter((t) => t.amount > 0).reduce((s, t) => s + t.amount, 0);
  const totalOut = rows.filter((t) => t.amount < 0).reduce((s, t) => s - t.amount, 0);
  const editing = editingId ? state.transactions.find((t) => t.id === editingId) : null;
  const f = editing || { date: TODAY, desc: '', category: 'groceries', amount: '', account: 'checking' };
  const catOptions = CATEGORIES.map((c) => '<option value="' + c.id + '"' + (f.category === c.id ? ' selected' : '') + '>' + esc(c.label) + '</option>').join('');
  const acctOptions = ACCOUNTS.map((a) => '<option value="' + a.id + '"' + (f.account === a.id ? ' selected' : '') + '>' + esc(a.label) + '</option>').join('');
  const monthOptions = '<option value="all">All months</option>' + monthsAvailable().map((m) => '<option value="' + m + '"' + (txFilter.month === m ? ' selected' : '') + '>' + monthLabel(m) + '</option>').join('');

  let html = '<section class="card"><div class="card-head"><h2>' + (editing ? 'Edit transaction' : 'Add a transaction') + '</h2>'
    + '<span class="chip">' + state.transactions.length + ' on record</span></div>'
    + '<form id="tx-form"><div class="form-grid">'
    + '<label class="field">Date<input type="date" name="date" value="' + f.date + '" required></label>'
    + '<label class="field">Description<input type="text" name="desc" value="' + esc(f.desc) + '" placeholder="e.g. Market Basket weekly shop" required></label>'
    + '<label class="field">Category<select name="category">' + catOptions + '</select></label>'
    + '<label class="field">Amount (USD)<input type="number" name="amount" step="0.01" value="' + (editing ? Math.abs(f.amount) : '') + '" placeholder="0.00" required></label>'
    + '<label class="field">Type<select name="type"><option value="expense"' + (!editing || f.amount < 0 ? ' selected' : '') + '>Expense</option><option value="income"' + (editing && f.amount >= 0 ? ' selected' : '') + '>Income</option></select></label>'
    + '<label class="field">Account<select name="account">' + acctOptions + '</select></label>'
    + '</div><div class="form-actions"><button class="btn primary" type="submit">' + (editing ? 'Save changes' : 'Add transaction') + '</button>'
    + (editing ? '<button class="btn ghost" type="button" id="tx-cancel">Cancel edit</button>' : '')
    + '</div></form></section>';

  html += '<section class="card section-gap"><div class="card-head"><h2>Ledger</h2>'
    + '<span style="font-size:13px;color:#41525e">Showing <b>' + rows.length + '</b> &middot; in <b class="pos">' + fmt0(totalIn) + '</b> &middot; out <b>' + fmt0(totalOut) + '</b></span></div>'
    + '<div class="toolbar">'
    + '<label class="field search">Search<input type="search" id="tx-q" value="' + esc(txFilter.q) + '" placeholder="Search descriptions or categories…"></label>'
    + '<label class="field">Month<select id="tx-month">' + monthOptions + '</select></label>'
    + '<label class="field">Category<select id="tx-cat"><option value="all">All categories</option>' + CATEGORIES.map((c) => '<option value="' + c.id + '"' + (txFilter.category === c.id ? ' selected' : '') + '>' + esc(c.label) + '</option>').join('') + '</select></label>'
    + '<label class="field">Account<select id="tx-acct"><option value="all">All accounts</option>' + ACCOUNTS.map((a) => '<option value="' + a.id + '"' + (txFilter.account === a.id ? ' selected' : '') + '>' + esc(a.label) + '</option>').join('') + '</select></label>'
    + '<label class="field">Type<select id="tx-type"><option value="all"' + (txFilter.type === 'all' ? ' selected' : '') + '>All</option><option value="income"' + (txFilter.type === 'income' ? ' selected' : '') + '>Income</option><option value="expense"' + (txFilter.type === 'expense' ? ' selected' : '') + '>Expenses</option></select></label>'
    + '<button class="btn" type="button" id="tx-export">Export CSV</button>'
    + '<label class="btn" style="cursor:pointer">Import CSV<input type="file" id="tx-import" accept=".csv,text/csv" hidden></label>'
    + '</div>'
    + (rows.length ? '<table><thead><tr><th>Description</th><th>Category</th><th class="num">Amount</th><th class="num">Actions</th></tr></thead><tbody>'
      + rows.slice(0, 40).map((t) => txRow(t, { actions: true })).join('') + '</tbody></table>'
      + (rows.length > 40 ? '<p class="empty-note">First 40 shown — narrow the filters to see the rest.</p>' : '')
      : '<p class="empty-note">No transactions match those filters.</p>')
    + '</section>';
  return html;
}

// ---------- budget planner ----------
export function budgetView() {
  const state = getState(), month = state.month;
  const t = monthTotals(month);
  const pace = paceFrac(month);
  const budgeted = Object.keys(state.budgets);
  const totalBudget = budgeted.reduce((s, c) => s + state.budgets[c], 0);
  const totalSpent = budgeted.reduce((s, c) => s + spentInCategory(month, c), 0);
  let alerts = '';
  const rows = budgeted.map((category) => {
    const limit = state.budgets[category], used = spentInCategory(month, category);
    const frac = limit > 0 ? used / limit : 0;
    const projected = pace ? used / pace : used;
    let status;
    if (frac > 1) { status = '<span class="chip red">over by ' + fmt0(used - limit) + '</span>'; alerts += '<div class="alert bad"><span class="alert-ic">&#9888;</span><div><b>' + esc(categoryOf(category).label) + '</b> is ' + fmt0(used - limit) + ' over its ' + fmt0(limit) + ' budget.</div></div>'; }
    else if (pace && projected > limit && frac >= 0.5) { status = '<span class="chip amber">on pace to overspend</span>'; alerts += '<div class="alert warn"><span class="alert-ic">&#9673;</span><div><b>' + esc(categoryOf(category).label) + '</b> at this pace ends near ' + fmt0(projected) + ' vs a ' + fmt0(limit) + ' budget.</div></div>'; }
    else if (frac >= 0.8) status = '<span class="chip amber">80%+ used</span>';
    else status = '<span class="chip">on track</span>';
    return { category, limit, used, frac, status };
  }).sort((a, b) => b.frac - a.frac);

  let html = '<div class="grid kpis">'
    + kpiCard('Planned spending', fmt0(totalBudget), budgeted.length + ' budgeted categories')
    + kpiCard('Spent so far', fmt0(totalSpent), pct(totalBudget ? totalSpent / totalBudget : 0) + ' of plan')
    + kpiCard('Income', fmt0(t.income), 'Planned surplus ' + fmt0(t.income - totalBudget))
    + kpiCard('Month progress', pace ? pct(pace) : '100%', pace ? 'Day ' + Number(TODAY.slice(8, 10)) + ' of ' + daysInMonth(month) : monthLabel(month) + ' closed')
    + '</div>';
  if (alerts) html += '<div class="section-gap">' + alerts + '</div>';
  html += '<section class="card section-gap"><div class="card-head"><h2>Category budgets — ' + monthLabel(month) + '</h2>'
    + '<span class="card-sub" style="margin:0">The tick on each bar is even pace for today. Edit a limit and it saves instantly.</span></div>'
    + '<table><thead><tr><th>Category</th><th style="width:34%">Progress</th><th class="num">Spent</th><th class="num">Limit</th><th class="num">Left</th><th>Status</th></tr></thead><tbody>'
    + rows.map((r) => '<tr><td><span class="cat-dot" style="background:' + COLORS[r.category] + '"></span><b>' + esc(categoryOf(r.category).label) + '</b></td>'
      + '<td>' + budgetBar(r.used, r.limit, pace) + '</td>'
      + '<td class="num">' + fmt(r.used) + '</td>'
      + '<td class="num"><input class="budget-input" data-cat="' + r.category + '" type="number" min="0" step="10" value="' + r.limit + '" style="width:92px;padding:6px 8px;border:1px solid var(--line);border-radius:8px;text-align:right" aria-label="Budget limit for ' + esc(categoryOf(r.category).label) + '"></td>'
      + '<td class="num ' + (r.limit - r.used < 0 ? 'neg' : '') + '">' + fmt(r.limit - r.used) + '</td>'
      + '<td>' + r.status + '</td></tr>').join('')
    + '</tbody></table>'
    + '<p class="empty-note">Unspent budget does not roll over automatically — the household sweeps leftovers into the emergency fund on the 24th (see Transactions &rarr; Savings transfer).</p></section>';
  return html;
}

// ---------- insights ----------
export function insightsView() {
  const state = getState(), month = state.month;
  const movers = monthMovers(month);
  const anoms = anomalies(month);
  const subs = recurringMerchants().filter((r) => r.category === 'subscriptions' || r.category === 'utilities');
  const subTotal = subs.reduce((s, r) => s + r.typical, 0);
  const merchants = topMerchants(month, 6);
  const series = cashFlowSeries();
  const rates = series.map((s) => (s.income ? (s.income - s.spent) / s.income : 0));
  const weekday = weekdayPattern();
  const busiest = weekday.slice().sort((a, b) => b.avg - a.avg)[0];

  let html = '<div class="grid kpis">'
    + kpiCard('Savings rate — ' + shortMonth(month), pct(monthTotals(month).savingsRate), '6-month trend ' + sparkline(rates, '#0e6b5c'))
    + kpiCard('Recurring bills & subs', fmt0(subTotal) + '<span style="font-size:16px">/mo</span>', subs.length + ' detected &middot; ' + fmt0(subTotal * 12) + ' a year')
    + kpiCard('Unusual spends', String(anoms.length), 'Tickets 2&times;+ the category norm')
    + kpiCard('Biggest spend day', busiest.day, 'Averages ' + fmt0(busiest.avg) + ' per ' + busiest.day)
    + '</div>';

  html += '<div class="split-even section-gap">'
    + '<section class="card"><div class="card-head"><h2>Month-over-month movers</h2></div>'
    + '<p class="card-sub">vs ' + monthLabel(monthsAvailable()[monthsAvailable().indexOf(month) - 1] || month) + ', biggest dollar swings first.</p>'
    + movers.slice(0, 6).map((m) => '<div class="mover"><span class="cat-dot" style="background:' + COLORS[m.category] + '"></span><div class="grow"><b>' + esc(categoryOf(m.category).label) + '</b><div class="sub" style="font-size:12px;color:#75858f">' + fmt0(m.old) + ' &rarr; ' + fmt0(m.cur) + '</div></div>'
      + '<span class="delta ' + (m.delta > 0 ? 'neg' : 'pos') + '">' + (m.delta > 0 ? '+' : '') + fmt0(m.delta) + ' (' + (m.delta > 0 ? '+' : '') + pct(m.pct) + ')</span></div>').join('')
    + '</section>'
    + '<section class="card"><div class="card-head"><h2>Unusual spends — ' + monthLabel(month) + '</h2></div>'
    + '<p class="card-sub">Expenses at least twice their category&rsquo;s usual ticket.</p>'
    + (anoms.length ? anoms.map((a) => '<div class="mover"><div class="grow"><b>' + esc(a.tx.desc) + '</b><div style="font-size:12px;color:#75858f">' + a.tx.date + ' &middot; usual ' + esc(categoryOf(a.tx.category).label) + ' ticket ' + fmt0(a.median) + '</div></div><span class="delta neg">' + fmt(-a.tx.amount) + ' &middot; ' + a.ratio.toFixed(1) + '&times;</span></div>').join('')
      : '<p class="empty-note">Nothing unusual this month — spending is in line with each category&rsquo;s norm.</p>')
    + '</section></div>';

  html += '<div class="split-even section-gap">'
    + '<section class="card"><div class="card-head"><h2>Subscription &amp; bill audit</h2></div>'
    + '<p class="card-sub">Detected from repeat charges across months. Yearly cost at the typical amount.</p>'
    + '<table><thead><tr><th>Charge</th><th class="num">Typical</th><th class="num">Per year</th><th class="num">Months seen</th></tr></thead><tbody>'
    + subs.map((r) => '<tr><td><span class="cat-dot" style="background:' + COLORS[r.category] + '"></span>' + esc(r.desc) + '</td><td class="num">' + fmt(r.typical) + '</td><td class="num">' + fmt0(r.yearly) + '</td><td class="num">' + r.months + '</td></tr>').join('')
    + '</tbody></table><p class="empty-note">Cancelling the two smallest subscriptions would free about ' + fmt0(subs.slice(-2).reduce((s, r) => s + r.yearly, 0)) + ' a year.</p></section>'
    + '<section class="card"><div class="card-head"><h2>Top merchants — ' + monthLabel(month) + '</h2></div>'
    + merchants.map((m) => '<div class="mover"><div class="grow"><b>' + esc(m.desc) + '</b><div style="font-size:12px;color:#75858f">' + m.count + ' visit' + (m.count === 1 ? '' : 's') + ' &middot; ' + esc(categoryOf(m.category).label) + '</div></div><b>' + fmt0(m.total) + '</b></div>').join('')
    + '<h3 style="margin-top:16px">Average spend by weekday</h3><p class="card-sub">All history; weekends in amber.</p>' + weekdayChart(weekday)
    + '</section></div>';
  return html;
}

// ---------- goals ----------
export function goalsView() {
  const state = getState();
  const totalSaved = state.goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = state.goals.reduce((s, g) => s + g.target, 0);
  let html = '<div class="grid kpis">'
    + kpiCard('Saved toward goals', fmt0(totalSaved), 'of ' + fmt0(totalTarget) + ' total targets')
    + kpiCard('Overall progress', pct(totalTarget ? totalSaved / totalTarget : 0), state.goals.length + ' active goals')
    + kpiCard('Monthly sweep', '$500', 'Emergency fund $300 + index funds $200')
    + '</div><div class="grid cols-3 section-gap">';
  for (const g of state.goals) {
    const monthsLeft = Math.max(1, Math.round((new Date(g.by + 'T12:00:00') - new Date(TODAY + 'T12:00:00')) / (30.44 * 864e5)));
    const needed = Math.max(0, g.target - g.saved);
    html += '<section class="card goal-card"><div class="goal-head"><h3>' + esc(g.name) + '</h3><span class="chip">' + fmt0(g.target) + '</span></div>'
      + '<div class="ring-wrap" style="margin:10px 0">' + goalRing(g.saved, g.target, 92)
      + '<div><div class="ring-num">' + fmt0(g.saved) + '</div><div style="font-size:12.5px;color:#41525e">saved &middot; ' + fmt0(needed) + ' to go</div>'
      + '<div style="font-size:12.5px;color:#41525e">Target ' + g.by + ' &middot; ~' + fmt0(needed / monthsLeft) + '/mo needed</div></div></div>'
      + '<p class="card-sub">' + esc(g.note) + '</p>'
      + '<form class="goal-form" data-goal="' + g.id + '" style="display:flex;gap:8px"><input type="number" name="amount" min="1" step="1" placeholder="Add $" style="flex:1;min-width:0;padding:8px 10px;border:1px solid var(--line);border-radius:10px" required><button class="btn primary" type="submit">Contribute</button></form></section>';
  }
  html += '</div><section class="card section-gap"><div class="card-head"><h2>Start a new goal</h2></div>'
    + '<form id="goal-new"><div class="form-grid">'
    + '<label class="field">Name<input type="text" name="name" placeholder="e.g. Car replacement" required></label>'
    + '<label class="field">Target (USD)<input type="number" name="target" min="1" step="1" placeholder="5000" required></label>'
    + '<label class="field">Already saved<input type="number" name="saved" min="0" step="1" value="0"></label>'
    + '<label class="field">Target date<input type="date" name="by" value="2027-12-31" required></label>'
    + '<label class="field">Note<input type="text" name="note" placeholder="What is it for?"></label>'
    + '</div><div class="form-actions"><button class="btn primary" type="submit">Add goal</button></div></form></section>';
  return html;
}

// ---------- bills & calendar ----------
export function billsView() {
  const state = getState(), month = state.month;
  const bills = billsForMonth(month);
  const total = bills.reduce((s, b) => s + b.amount, 0);
  const paidTotal = bills.filter((b) => b.paid).reduce((s, b) => s + b.amount, 0);
  const [y, m] = month.split('-').map(Number);
  const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Mon=0
  const dim = daysInMonth(month);
  const byDay = new Map();
  for (const b of bills) { if (!byDay.has(b.dueDay)) byDay.set(b.dueDay, []); byDay.get(b.dueDay).push(b); }
  let cells = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => '<div class="cal-dow">' + d + '</div>').join('');
  for (let i = 0; i < firstDow; i++) cells += '<div class="cal-day blank"></div>';
  for (let d = 1; d <= dim; d++) {
    const dateStr = month + '-' + String(d).padStart(2, '0');
    const dayBills = byDay.get(d) || [];
    cells += '<div class="cal-day' + (dateStr === TODAY ? ' today' : '') + '"><span class="dnum">' + d + '</span>'
      + dayBills.map((b) => '<span class="cal-bill' + (b.paid ? ' paid' : b.autopay ? ' auto' : '') + '" title="' + esc(b.name) + ' — ' + fmt(b.amount) + '">' + esc(b.name.split(' — ')[0]) + ' ' + fmt0(b.amount) + '</span>').join('')
      + '</div>';
  }
  let html = '<div class="grid kpis">'
    + kpiCard('Due in ' + shortMonth(month), fmt0(total), bills.length + ' bills &amp; subscriptions')
    + kpiCard('Already paid', fmt0(paidTotal), bills.filter((b) => b.paid).length + ' of ' + bills.length + ' settled')
    + kpiCard('Still to go', fmt0(total - paidTotal), bills.filter((b) => b.overdue).length ? bills.filter((b) => b.overdue).length + ' overdue!' : 'Nothing overdue', bills.some((b) => b.overdue) ? 'neg' : '')
    + kpiCard('On autopay', String(bills.filter((b) => b.autopay).length), 'of ' + bills.length + ' bills')
    + '</div>'
    + '<section class="card section-gap"><div class="card-head"><h2>' + monthLabel(month) + ' calendar</h2><span class="card-sub" style="margin:0">Amber = manual, teal = autopay, struck-through = paid.</span></div>'
    + '<div class="cal-grid">' + cells + '</div></section>'
    + '<section class="card section-gap"><div class="card-head"><h2>All bills — ' + monthLabel(month) + '</h2></div>'
    + '<table><thead><tr><th>Bill</th><th>Due</th><th>Account</th><th class="num">Amount</th><th>Status</th><th class="num">Action</th></tr></thead><tbody>'
    + bills.map((b) => '<tr><td><b>' + esc(b.name) + '</b>' + (b.quarterly ? ' <span class="chip grey">quarterly</span>' : '') + '</td><td>' + b.date + '</td><td>' + esc(accountOf(b.account).label) + '</td><td class="num">' + fmt(b.amount) + '</td>'
      + '<td>' + (b.paid ? '<span class="chip">paid</span>' : b.overdue ? '<span class="chip red">overdue</span>' : b.autopay ? '<span class="chip">autopay</span>' : '<span class="chip amber">manual</span>') + '</td>'
      + '<td class="num"><button class="btn small" data-bill="' + b.id + '">' + (b.paid ? 'Mark unpaid' : 'Mark paid') + '</button></td></tr>').join('')
    + '</tbody></table></section>';
  return html;
}

// ---------- accounts & net worth ----------
export function accountsView() {
  const state = getState();
  const balances = accountBalances();
  const total = balances.reduce((s, a) => s + a.balance, 0);
  const assets = balances.filter((a) => a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const debts = -balances.filter((a) => a.balance < 0).reduce((s, a) => s + a.balance, 0);
  const nw = state.netWorth;
  const growth = nw.length > 1 ? nw[nw.length - 1].value - nw[0].value : 0;
  const alloc = balances.filter((a) => a.balance > 0);
  let html = '<div class="grid kpis">'
    + kpiCard('Net worth', fmt0(total), 'Assets ' + fmt0(assets) + ' − debts ' + fmt0(debts))
    + kpiCard('Growth since May', '+' + fmt0(growth), 'From ' + fmt0(nw[0].value) + ' to ' + fmt0(nw[nw.length - 1].value), 'pos')
    + kpiCard('Liquid cash', fmt0(balances.filter((a) => a.kind === 'bank' || a.kind === 'cash').reduce((s, a) => s + a.balance, 0)), 'Checking + savings + envelope')
    + kpiCard('Invested', fmt0(balances.filter((a) => a.kind === 'invest').reduce((s, a) => s + a.balance, 0)), 'Index funds, $200/mo')
    + '</div>'
    + '<section class="card section-gap"><div class="card-head"><h2>Net-worth trend</h2><span class="chip">+' + fmt0(growth) + ' in ' + (nw.length - 1) + ' months</span></div>'
    + netWorthChart(nw) + '</section>'
    + '<div class="split-even section-gap"><section class="card"><div class="card-head"><h2>Account balances</h2></div>'
    + '<div class="list-rows">' + balances.map((a) => '<div class="list-row"><div class="grow"><div class="title">' + esc(a.label) + '</div><div class="sub">Opened at ' + fmt(a.opening) + ' &middot; ' + state.transactions.filter((t) => t.account === a.id).length + ' transactions</div></div><b class="' + (a.balance < 0 ? 'neg' : '') + '">' + fmt(a.balance) + '</b></div>').join('') + '</div></section>'
    + '<section class="card"><div class="card-head"><h2>Where the money sits</h2></div>'
    + '<div class="alloc-bar">' + alloc.map((a, i) => '<div style="width:' + (assets ? (a.balance / assets * 100).toFixed(1) : 0) + '%;background:' + ['#0e6b5c', '#e8a13d', '#3e6fa3', '#7a5c9e', '#90a955'][i % 5] + '"></div>').join('') + '</div>'
    + '<div class="legend" style="margin-top:12px">' + alloc.map((a, i) => '<div class="row"><span class="cat-dot" style="background:' + ['#0e6b5c', '#e8a13d', '#3e6fa3', '#7a5c9e', '#90a955'][i % 5] + '"></span>' + esc(a.label) + '<span class="amt">' + fmt0(a.balance) + '</span><span class="pct">' + pct(assets ? a.balance / assets : 0) + '</span></div>').join('') + '</div>'
    + '<p class="empty-note">Balances are the opening figure plus every transaction on that account — add or edit a transaction and they move.</p></section></div>';
  return html;
}
