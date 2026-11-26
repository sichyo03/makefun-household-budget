// Page views for HearthLedger. Each view returns HTML for <main> and wires
// its own controls after insertion (bind functions below). Hash routes:
// dashboard, transactions, budget, insights, goals, bills.

import { ACCOUNTS, CATEGORIES, MONTHS, categoryOf, isUsableAmount, money, moneyShort } from './data.js';
import {
  addGoal, addTransaction, contributeToGoal, deleteTransaction, getState,
  monthTotals, monthTransactions, nextBillTotal, nextId, resetDemo,
  setBudget, setMonth, spentInCategory, spendingByCategory, toggleBillPaid,
  upcomingBills, updateTransaction,
} from './store.js';
import { donutChart, goalRing, progressBar, trendBars } from './charts.js';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function monthLabel(id) {
  const m = MONTHS.find((x) => x.id === id);
  return m ? m.label : id;
}

export function monthPicker(state) {
  const options = MONTHS.map((m) =>
    '<option value="' + m.id + '"' + (m.id === state.month ? ' selected' : '') + '>' + m.label + '</option>').join('');
  return '<label class="month-picker">Month <select id="month-select">' + options + '</select></label>';
}

function statCard(label, value, sub, cls) {
  return '<article class="card stat ' + (cls || '') + '"><h3>' + label + '</h3>'
    + '<p class="stat-value">' + value + '</p><p class="muted">' + sub + '</p></article>';
}

// ---- Dashboard -----------------------------------------------------------

export function dashboardView(state) {
  const totals = monthTotals(state.month);
  const rows = spendingByCategory(state.month);
  const recent = monthTransactions(state.month).slice(0, 6);
  const budgetTotal = Object.values(state.budgets).reduce((a, b) => a + b, 0);
  const usedTotal = totals.spending + totals.saved;
  const billsDue = state.bills.filter((b) => !b.paid).length;

  const recentRows = recent.map((t) => txRow(t, false)).join('');
  const insights = dashboardInsights(state, totals, rows);

  return '<section class="page-head"><div><h2>Dashboard</h2>'
    + '<p class="muted">The Rivera household — two salaries, two kids, one plan.</p></div>'
    + monthPicker(state) + '</section>'
    + '<section class="grid stats">'
    + statCard('Income in', money(totals.income), monthLabel(state.month), 'pos')
    + statCard('Spending out', money(totals.spending), rows.length + ' categories', 'neg')
    + statCard('Saved', money(totals.saved), 'transfers to savings', '')
    + statCard('Left to plan', money(totals.balance), 'income minus all outgoings', totals.balance >= 0 ? 'pos' : 'neg')
    + '</section>'
    + '<section class="grid two">'
    + '<article class="card"><h3>Where the money went</h3>' + donutChart(rows, 190)
    + '<p><a class="btn ghost" href="#/insights">See full breakdown</a></p></article>'
    + '<article class="card"><h3>Budget health</h3>'
    + '<p class="big-line">' + moneyShort(usedTotal) + ' <span class="muted">of</span> ' + moneyShort(budgetTotal) + ' <span class="muted">planned</span></p>'
    + progressBar(usedTotal, budgetTotal)
    + '<ul class="plain">' + insights + '</ul>'
    + '<p class="muted">' + billsDue + ' unpaid bills totalling ' + money(nextBillTotal()) + '.</p>'
    + '<p><a class="btn ghost" href="#/budget">Open budget planner</a> <a class="btn ghost" href="#/bills">Bills &amp; reminders</a></p></article>'
    + '</section>'
    + '<section class="card"><div class="card-head"><h3>Latest activity</h3>'
    + '<a class="btn small" href="#/transactions">All transactions</a></div>'
    + '<div class="table-wrap"><table class="tx"><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Account</th><th class="num">Amount</th></tr></thead>'
    + '<tbody>' + recentRows + '</tbody></table></div></section>';
}

function dashboardInsights(state, totals, rows) {
  const items = [];
  if (rows.length) {
    const top = rows[0];
    items.push('<li>Biggest category: <strong>' + esc(categoryOf(top.category).label) + '</strong> at ' + money(top.total) + '.</li>');
  }
  const over = Object.keys(state.budgets).filter((c) => spentInCategory(state.month, c) > state.budgets[c]);
  if (over.length) {
    items.push('<li>Over budget: ' + over.map((c) => esc(categoryOf(c).label)).join(', ') + '.</li>');
  } else {
    items.push('<li>Every category is inside its budget this month.</li>');
  }
  const rate = totals.income > 0 ? Math.round(((totals.saved + Math.max(0, totals.balance)) / totals.income) * 100) : 0;
  items.push('<li>Savings rate so far: <strong>' + rate + '%</strong> of income kept or moved to savings.</li>');
  return items.join('');
}

// ---- Transactions --------------------------------------------------------

let txFilter = { query: '', category: 'all', account: 'all' };
let editingId = null;

function txRow(t, withActions) {
  const cat = categoryOf(t.category);
  const cls = t.amount >= 0 ? 'pos' : 'neg';
  const actions = withActions
    ? '<td class="actions"><button type="button" class="btn tiny" data-edit="' + t.id + '">Edit</button> '
      + '<button type="button" class="btn tiny danger" data-del="' + t.id + '">Delete</button></td>'
    : '';
  return '<tr><td>' + esc(t.date) + '</td><td>' + esc(t.desc) + '</td>'
    + '<td><span class="chip" style="--chip:' + cat.color + '">' + esc(cat.label) + '</span></td>'
    + '<td>' + esc(t.account) + '</td><td class="num ' + cls + '">' + money(t.amount) + '</td>' + actions + '</tr>';
}

export function transactionsView(state) {
  const all = monthTransactions(state.month);
  const filtered = all.filter((t) =>
    (txFilter.category === 'all' || t.category === txFilter.category)
    && (txFilter.account === 'all' || t.account === txFilter.account)
    && (txFilter.query === '' || t.desc.toLowerCase().includes(txFilter.query.toLowerCase())));
  const editing = editingId ? state.transactions.find((t) => t.id === editingId) : null;

  const catOptions = ['<option value="all">All categories</option>']
    .concat(CATEGORIES.map((c) => '<option value="' + c.id + '"' + (txFilter.category === c.id ? ' selected' : '') + '>' + c.label + '</option>')).join('');
  const accOptions = ['<option value="all">All accounts</option>']
    .concat(ACCOUNTS.map((a) => '<option value="' + esc(a) + '"' + (txFilter.account === a ? ' selected' : '') + '>' + esc(a) + '</option>')).join('');
  const formCatOptions = CATEGORIES.map((c) =>
    '<option value="' + c.id + '"' + (editing && editing.category === c.id ? ' selected' : '') + '>' + c.label + '</option>').join('');
  const formAccOptions = ACCOUNTS.map((a) =>
    '<option value="' + esc(a) + '"' + (editing && editing.account === a ? ' selected' : '') + '>' + esc(a) + '</option>').join('');

  const rows = filtered.map((t) => txRow(t, true)).join('')
    || '<tr><td colspan="6" class="muted">Nothing matches those filters. Try clearing the search.</td></tr>';
  const sum = filtered.reduce((a, t) => a + t.amount, 0);

  return '<section class="page-head"><div><h2>Transactions</h2>'
    + '<p class="muted">Every dollar in and out for ' + monthLabel(state.month) + '.</p></div>'
    + monthPicker(state) + '</section>'
    + '<section class="card"><div class="filters">'
    + '<label>Search <input id="tx-search" type="search" value="' + esc(txFilter.query) + '" placeholder="e.g. groceries, rent"></label>'
    + '<label>Category <select id="tx-cat">' + catOptions + '</select></label>'
    + '<label>Account <select id="tx-acc">' + accOptions + '</select></label>'
    + '<p class="filter-sum">' + filtered.length + ' entries · net <strong>' + money(sum) + '</strong></p></div>'
    + '<div class="table-wrap"><table class="tx"><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Account</th><th class="num">Amount</th><th></th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table></div></section>'
    + '<section class="card"><h3>' + (editing ? 'Edit transaction' : 'Add a transaction') + '</h3>'
    + '<form id="tx-form" class="form-grid">'
    + '<label>Date <input name="date" type="date" required value="' + (editing ? esc(editing.date) : state.month + '-26') + '"></label>'
    + '<label>Description <input name="desc" type="text" required value="' + (editing ? esc(editing.desc) : '') + '" placeholder="What was it?"></label>'
    + '<label>Category <select name="category">' + formCatOptions + '</select></label>'
    + '<label>Account <select name="account">' + formAccOptions + '</select></label>'
    + '<label>Amount ($) <input name="amount" type="number" step="0.01" required value="' + (editing ? editing.amount : '') + '" placeholder="-42.50 or 250"></label>'
    + '<div class="form-actions"><button class="btn" type="submit">' + (editing ? 'Save changes' : 'Add transaction') + '</button>'
    + (editing ? ' <button class="btn ghost" type="button" id="tx-cancel">Cancel edit</button>' : '') + '</div>'
    + '<p class="muted small">Use a negative amount for spending, positive for income. Saved in this browser only.</p>'
    + '</form></section>';
}

// ---- Budget planner ------------------------------------------------------

export function budgetView(state) {
  const cats = CATEGORIES.filter((c) => c.id !== 'income');
  const cards = cats.map((c) => {
    const limit = state.budgets[c.id] || 0;
    const used = spentInCategory(state.month, c.id);
    const left = limit - used;
    const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
    return '<article class="card budget-card"><div class="card-head"><h3><span class="swatch" style="background:' + c.color + '"></span>' + c.label + '</h3>'
      + '<span class="pct ' + (pct >= 100 ? 'neg' : pct >= 80 ? 'warn-text' : 'pos') + '">' + pct + '% used</span></div>'
      + progressBar(used, limit)
      + '<p class="muted">' + money(used) + ' spent · ' + (left >= 0 ? money(left) + ' left' : money(-left) + ' over') + '</p>'
      + '<form class="budget-form" data-budget="' + c.id + '"><label>Monthly budget ($) '
      + '<input name="amount" type="number" min="0" step="1" value="' + limit + '"></label>'
      + '<button class="btn small" type="submit">Save</button></form></article>';
  }).join('');
  const totals = monthTotals(state.month);
  const budgetTotal = Object.values(state.budgets).reduce((a, b) => a + b, 0);

  return '<section class="page-head"><div><h2>Budget planner</h2>'
    + '<p class="muted">Set a limit per category; the bars fill as you spend in ' + monthLabel(state.month) + '.</p></div>'
    + monthPicker(state) + '</section>'
    + '<section class="card"><p class="big-line">Planned ' + moneyShort(budgetTotal) + ' against income of ' + moneyShort(totals.income) + '</p>'
    + '<p class="muted">That leaves ' + money(totals.income - budgetTotal) + ' unassigned — a good cushion for surprises or extra savings. '
    + 'Groceries and housing are usually the two to watch first.</p></section>'
    + '<section class="grid budgets">' + cards + '</section>';
}

// ---- Insights ------------------------------------------------------------

export function insightsView(state) {
  const rows = spendingByCategory(state.month);
  const trendData = MONTHS.map((m) => {
    const t = monthTotals(m.id);
    return { label: m.label.replace(' 2026', ''), income: t.income, spending: t.spending, saved: t.saved };
  });
  const avgRows = CATEGORIES.filter((c) => c.id !== 'income' && c.id !== 'savings').map((c) => {
    const total3 = MONTHS.reduce((a, m) => a + spentInCategory(m.id, c.id), 0);
    return { category: c.id, avg: total3 / MONTHS.length, budget: state.budgets[c.id] || 0 };
  }).sort((a, b) => b.avg - a.avg);
  const avgList = avgRows.map((r) =>
    '<li><span class="swatch" style="background:' + categoryOf(r.category).color + '"></span>'
    + esc(categoryOf(r.category).label) + ' — average <strong>' + money(r.avg) + '</strong>/month, budget ' + moneyShort(r.budget) + '</li>').join('');

  return '<section class="page-head"><div><h2>Insights</h2>'
    + '<p class="muted">Patterns across the last three months, not just this one.</p></div>'
    + monthPicker(state) + '</section>'
    + '<section class="grid two">'
    + '<article class="card"><h3>Spending by category — ' + monthLabel(state.month) + '</h3>' + donutChart(rows, 200) + '</article>'
    + '<article class="card"><h3>Income vs outgoings</h3>' + trendBars(trendData)
    + '<p class="muted">October ran higher on car insurance and a family birthday; November is back near September levels.</p></article>'
    + '</section>'
    + '<section class="card"><h3>Three-month averages vs budget</h3><ul class="plain">' + avgList + '</ul>'
    + '<p class="muted">If an average sits above its budget three months running, the budget — not the household — usually needs adjusting.</p></section>';
}

// ---- Goals ---------------------------------------------------------------

export function goalsView(state) {
  const cards = state.goals.map((g) => {
    const left = g.target - g.saved;
    return '<article class="card goal-card"><div class="goal-top">' + goalRing(g.saved, g.target)
      + '<div><h3>' + esc(g.name) + '</h3><p class="muted">' + esc(g.note) + '</p>'
      + '<p class="big-line">' + moneyShort(g.saved) + ' <span class="muted">of</span> ' + moneyShort(g.target) + '</p>'
      + '<p class="muted">' + (left > 0 ? moneyShort(left) + ' to go' : 'Goal reached — well done!') + '</p></div></div>'
      + '<form class="goal-form" data-goal="' + g.id + '"><label>Add contribution ($) '
      + '<input name="amount" type="number" min="1" step="1" value="50"></label>'
      + '<button class="btn small" type="submit">Add</button></form></article>';
  }).join('');
  const totalSaved = state.goals.reduce((a, g) => a + g.saved, 0);
  const totalTarget = state.goals.reduce((a, g) => a + g.target, 0);

  return '<section class="page-head"><div><h2>Savings goals</h2>'
    + '<p class="muted">' + moneyShort(totalSaved) + ' saved toward ' + moneyShort(totalTarget) + ' across ' + state.goals.length + ' goals.</p></div></section>'
    + '<section class="grid budgets">' + cards + '</section>'
    + '<section class="card"><h3>Start a new goal</h3><form id="goal-new" class="form-grid">'
    + '<label>Goal name <input name="name" type="text" required placeholder="e.g. Bike for Leo"></label>'
    + '<label>Target ($) <input name="target" type="number" min="10" step="1" required placeholder="600"></label>'
    + '<label>Already saved ($) <input name="saved" type="number" min="0" step="1" value="0"></label>'
    + '<label>Note <input name="note" type="text" placeholder="Why it matters"></label>'
    + '<div class="form-actions"><button class="btn" type="submit">Create goal</button></div></form></section>';
}

// ---- Bills ---------------------------------------------------------------

export function billsView(state) {
  const bills = upcomingBills();
  const unpaid = bills.filter((b) => !b.paid);
  const rows = bills.map((b) => {
    const status = b.paid ? '<span class="chip paid">Paid</span>' : '<span class="chip due">Due ' + esc(b.due) + '</span>';
    return '<tr class="' + (b.paid ? 'is-paid' : '') + '"><td>' + esc(b.name) + '</td><td>' + esc(b.recurring) + '</td>'
      + '<td>' + esc(b.account) + '</td><td>' + status + '</td><td class="num">' + money(b.amount) + '</td>'
      + '<td class="actions"><button type="button" class="btn tiny" data-bill="' + b.id + '">' + (b.paid ? 'Mark unpaid' : 'Mark paid') + '</button></td></tr>';
  }).join('');

  return '<section class="page-head"><div><h2>Bills &amp; reminders</h2>'
    + '<p class="muted">What is due next, and what has already gone out.</p></div></section>'
    + '<section class="grid stats">'
    + statCard('Still to pay', money(nextBillTotal()), unpaid.length + ' bills unpaid', 'neg')
    + statCard('Next due', unpaid.length ? esc(unpaid[0].name) : 'Nothing due', unpaid.length ? 'due ' + unpaid[0].due : 'all caught up', '')
    + statCard('Largest bill', unpaid.length ? money(Math.max(...unpaid.map((b) => b.amount))) : '$0.00', 'usually the rent', '')
    + '</section>'
    + '<section class="card"><div class="table-wrap"><table class="tx"><thead><tr><th>Bill</th><th>Repeats</th><th>Account</th><th>Status</th><th class="num">Amount</th><th></th></tr></thead>'
    + '<tbody>' + rows + '</tbody></table></div>'
    + '<p class="muted">Tip: pay the internet and mobile bills before the 29th to keep the family plan discounts.</p></section>';
}

// ---- binding -------------------------------------------------------------

export function bindCommon(root, rerender) {
  const monthSelect = root.querySelector('#month-select');
  if (monthSelect) monthSelect.addEventListener('change', () => { setMonth(monthSelect.value); rerender(); });
  const resetBtn = document.querySelector('#reset-demo');
  if (resetBtn && !resetBtn.dataset.bound) {
    resetBtn.dataset.bound = '1';
    resetBtn.addEventListener('click', () => { resetDemo(); editingId = null; rerender(); });
  }
}

export function bindTransactions(root, rerender) {
  const search = root.querySelector('#tx-search');
  const cat = root.querySelector('#tx-cat');
  const acc = root.querySelector('#tx-acc');
  if (search) search.addEventListener('input', () => { txFilter.query = search.value; rerender(true); });
  if (cat) cat.addEventListener('change', () => { txFilter.category = cat.value; rerender(); });
  if (acc) acc.addEventListener('change', () => { txFilter.account = acc.value; rerender(); });

  root.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => {
    editingId = btn.dataset.edit;
    rerender();
    const form = root.querySelector('#tx-form');
    if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));
  root.querySelectorAll('[data-del]').forEach((btn) => btn.addEventListener('click', () => {
    deleteTransaction(btn.dataset.del);
    if (editingId === btn.dataset.del) editingId = null;
    rerender();
  }));

  const cancel = root.querySelector('#tx-cancel');
  if (cancel) cancel.addEventListener('click', () => { editingId = null; rerender(); });

  const form = root.querySelector('#tx-form');
  if (form) form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const data = new FormData(form);
    const amount = Number(data.get('amount'));
    if (!isUsableAmount(amount)) return;
    const payload = {
      date: String(data.get('date')), desc: String(data.get('desc')).trim(),
      category: String(data.get('category')), account: String(data.get('account')), amount,
    };
    if (editingId) { updateTransaction(editingId, payload); editingId = null; }
    else addTransaction({ id: nextId('t'), ...payload });
    rerender();
  });
}

export function bindBudget(root, rerender) {
  root.querySelectorAll('[data-budget]').forEach((form) => form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const amount = Number(new FormData(form).get('amount'));
    if (Number.isFinite(amount) && amount >= 0) { setBudget(form.dataset.budget, amount); rerender(); }
  }));
}

export function bindGoals(root, rerender) {
  root.querySelectorAll('[data-goal]').forEach((form) => form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const amount = Number(new FormData(form).get('amount'));
    if (Number.isFinite(amount) && amount > 0) { contributeToGoal(form.dataset.goal, amount); rerender(); }
  }));
  const form = root.querySelector('#goal-new');
  if (form) form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const data = new FormData(form);
    addGoal({
      id: nextId('g'), name: String(data.get('name')).trim(),
      target: Number(data.get('target')) || 0, saved: Number(data.get('saved')) || 0,
      note: String(data.get('note') || '').trim(),
    });
    rerender();
  });
}

export function bindBills(root, rerender) {
  root.querySelectorAll('[data-bill]').forEach((btn) => btn.addEventListener('click', () => {
    toggleBillPaid(btn.dataset.bill);
    rerender();
  }));
}

export function currentEditingId() {
  return editingId;
}
