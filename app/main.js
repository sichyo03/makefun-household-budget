// HearthLedger v2 entry: hash router, month picker, sidebar summary,
// and all form/button wiring. Views are pure renders from state.js.
import {
  addGoal, addTransaction, contributeToGoal, deleteTransaction, fmt, fmt0,
  getState, monthLabel, monthTotals, monthsAvailable, nextId, resetDemo,
  setBudget, setMonth, toggleBillPaid, updateTransaction,
} from './state.js';
import {
  accountsView, billsView, budgetView, dashboardView, getEditing, goalsView,
  insightsView, setEditing, transactionsView, txFilter,
} from './views.js';

const ROUTES = {
  '/': { title: 'Dashboard', sub: 'The month at a glance — cash flow, budgets, bills and goals.', view: dashboardView, nav: 'dashboard' },
  '/transactions': { title: 'Transactions', sub: 'Search, filter, add, edit, import and export the household ledger.', view: transactionsView, nav: 'transactions' },
  '/budget': { title: 'Budget planner', sub: 'Per-category limits with even-pace markers and overspend alerts.', view: budgetView, nav: 'budget' },
  '/insights': { title: 'Insights', sub: 'Movers, unusual spends, subscription audit and weekday patterns.', view: insightsView, nav: 'insights' },
  '/goals': { title: 'Savings goals', sub: 'Progress rings, monthly amounts needed, one-tap contributions.', view: goalsView, nav: 'goals' },
  '/bills': { title: 'Bills & calendar', sub: 'Every due date on one calendar — autopay, manual and overdue.', view: billsView, nav: 'bills' },
  '/accounts': { title: 'Accounts & net worth', sub: 'Balances per account and the household net-worth trend.', view: accountsView, nav: 'accounts' },
};

const app = document.getElementById('app');
const toastEl = document.getElementById('toast');
let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
}

function renderChrome() {
  const state = getState();
  const sel = document.getElementById('month-select');
  sel.innerHTML = monthsAvailable().map((m) => '<option value="' + m + '"' + (m === state.month ? ' selected' : '') + '>' + monthLabel(m) + '</option>').join('');
  document.getElementById('nav-tx-count').textContent = state.transactions.length;
  const t = monthTotals(state.month);
  const over = Object.keys(state.budgets).filter((c) => {
    const spent = state.transactions.filter((x) => x.date.startsWith(state.month) && x.category === c && x.amount < 0).reduce((s, x) => s - x.amount, 0);
    return spent > state.budgets[c];
  }).length;
  document.getElementById('nav-budget-alert').textContent = over ? over + ' over' : '';
  const unpaid = state.bills.filter((b) => !(state.paidBills[state.month] || []).includes(b.id)).length;
  document.getElementById('nav-bills-due').textContent = unpaid ? unpaid + ' due' : '';
  document.getElementById('side-summary').innerHTML =
    '<h3>' + monthLabel(state.month) + '</h3>'
    + '<div class="row"><span>Income</span><b>' + fmt0(t.income) + '</b></div>'
    + '<div class="row"><span>Spent</span><b>' + fmt0(t.spent) + '</b></div>'
    + '<div class="row"><span>Kept</span><b>' + fmt0(t.income - t.spent) + '</b></div>'
    + '<div class="row"><span>To savings</span><b>' + fmt0(t.saved) + '</b></div>';
}

function render() {
  const route = ROUTES[location.hash.replace(/^#/, '')] || ROUTES['/'];
  document.getElementById('page-title').textContent = route.title;
  document.getElementById('page-sub').textContent = route.sub;
  document.title = 'HearthLedger — ' + route.title;
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === route.nav));
  app.innerHTML = route.view();
  renderChrome();
  bindPage();
  window.scrollTo(0, 0);
}

function bindPage() {
  // Transaction add/edit form
  const txForm = document.getElementById('tx-form');
  if (txForm) {
    txForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(txForm);
      const amount = Math.abs(Number(fd.get('amount')) || 0);
      const signed = fd.get('type') === 'income' ? amount : -amount;
      const patch = {
        date: String(fd.get('date')), desc: String(fd.get('desc')).trim(),
        category: String(fd.get('category')), amount: signed, account: String(fd.get('account')),
      };
      if (getEditing()) { updateTransaction(getEditing(), patch); setEditing(null); toast('Transaction updated'); }
      else { addTransaction(Object.assign({ id: nextId('tx') }, patch)); toast('Transaction added'); }
      render();
    });
    const cancel = document.getElementById('tx-cancel');
    if (cancel) cancel.addEventListener('click', () => { setEditing(null); render(); });
  }
  // Ledger filters (re-render on change; keep focus on search)
  const q = document.getElementById('tx-q');
  if (q) {
    q.addEventListener('input', () => {
      txFilter.q = q.value;
      const pos = q.selectionStart;
      render();
      const again = document.getElementById('tx-q');
      if (again) { again.focus(); again.setSelectionRange(pos, pos); }
    });
  }
  const bindFilter = (id, key) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', () => { txFilter[key] = el.value; render(); });
  };
  bindFilter('tx-month', 'month'); bindFilter('tx-cat', 'category');
  bindFilter('tx-acct', 'account'); bindFilter('tx-type', 'type');
  // Edit/delete buttons
  app.querySelectorAll('[data-edit]').forEach((b) => b.addEventListener('click', () => { setEditing(b.dataset.edit); render(); window.scrollTo(0, 0); }));
  app.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', () => { deleteTransaction(b.dataset.del); toast('Transaction deleted'); render(); }));
  // CSV export / import
  const exp = document.getElementById('tx-export');
  if (exp) exp.addEventListener('click', exportCsv);
  const imp = document.getElementById('tx-import');
  if (imp) imp.addEventListener('change', () => { if (imp.files[0]) importCsv(imp.files[0]); });
  // Budget limit inputs
  app.querySelectorAll('.budget-input').forEach((input) => {
    input.addEventListener('change', () => {
      const v = Math.max(0, Number(input.value) || 0);
      setBudget(input.dataset.cat, v);
      toast('Budget updated');
      render();
    });
  });
  // Goal contributions + new goal
  app.querySelectorAll('.goal-form').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = Number(new FormData(form).get('amount')) || 0;
      if (amount > 0) { contributeToGoal(form.dataset.goal, amount); toast('Added ' + fmt(amount) + ' to the goal'); render(); }
    });
  });
  const goalNew = document.getElementById('goal-new');
  if (goalNew) {
    goalNew.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(goalNew);
      addGoal({
        id: nextId('g'), name: String(fd.get('name')).trim(),
        target: Math.max(1, Number(fd.get('target')) || 1),
        saved: Math.max(0, Number(fd.get('saved')) || 0),
        by: String(fd.get('by')), note: String(fd.get('note') || ''),
      });
      toast('Goal added'); render();
    });
  }
  // Bill paid toggles
  app.querySelectorAll('[data-bill]').forEach((b) => b.addEventListener('click', () => {
    toggleBillPaid(b.dataset.bill, getState().month);
    toast('Bill status updated'); render();
  }));
}

// ---------- CSV import/export ----------
function exportCsv() {
  const rows = [['date', 'description', 'category', 'amount', 'account']];
  for (const t of getState().transactions) {
    rows.push([t.date, '"' + t.desc.replace(/"/g, '""') + '"', t.category, t.amount.toFixed(2), t.account]);
  }
  const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'hearthledger-transactions.csv';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('CSV exported — ' + getState().transactions.length + ' rows');
}

function importCsv(file) {
  file.text().then((text) => {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    let added = 0;
    for (const line of lines.slice(1)) {
      const parts = line.match(/("([^"]|"")*"|[^,]*)/g).filter((p) => p !== '');
      if (parts.length < 5) continue;
      const clean = (s) => s.replace(/^"|"$/g, '').replace(/""/g, '"').trim();
      const date = clean(parts[0]), desc = clean(parts[1]), category = clean(parts[2]);
      const amount = Number(clean(parts[3])), account = clean(parts[4]);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !desc || !isFinite(amount)) continue;
      addTransaction({ id: nextId('tx'), date, desc, category, amount, account });
      added += 1;
    }
    toast(added ? 'Imported ' + added + ' transactions' : 'No valid rows found in that CSV');
    render();
  }).catch(() => toast('Could not read that file'));
}

// ---------- chrome wiring ----------
document.getElementById('month-select').addEventListener('change', (e) => { setMonth(e.target.value); render(); });
document.getElementById('quick-add').addEventListener('click', () => {
  setEditing(null);
  if (location.hash !== '#/transactions') location.hash = '#/transactions';
  else render();
});
document.getElementById('reset-demo').addEventListener('click', () => {
  resetDemo(); setEditing(null);
  Object.assign(txFilter, { q: '', category: 'all', account: 'all', type: 'all', month: 'all' });
  toast('Demo data reset'); render();
});
window.addEventListener('hashchange', render);
render();
