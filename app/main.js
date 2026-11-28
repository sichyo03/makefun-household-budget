// HearthLedger entry: hash router, month picker, sidebar summary, toast.
// The dashboard (the landing page) loads with the first paint; the other
// six views are fetched by import() the first time their route opens, so
// the first load carries only what the cover needs. Each view module
// renders from state and optionally wires its own controls via bind().
import { TODAY } from './seed.js';
import { fmt0, monthLabel } from './format.js';
import { getState, resetDemo, setMonth } from './store.js';
import { billsForMonth, monthTotals, monthsAvailable } from './stats.js';
import { setEditing, txFilter } from './views/shared.js';
import { dashboardView } from './views/dashboard.js';

const ROUTES = {
  '/': { title: 'Dashboard', sub: 'The month at a glance — cash flow, budgets, bills and goals.', nav: 'dashboard', view: dashboardView },
  '/transactions': { title: 'Transactions', sub: 'Search, filter, add, edit, import and export the household ledger.', nav: 'transactions', load: () => import('./views/transactions.js'), pick: (m) => [m.transactionsView, m.bindTransactions] },
  '/budget': { title: 'Budget planner', sub: 'Per-category limits with even-pace markers and overspend alerts.', nav: 'budget', load: () => import('./views/budget.js'), pick: (m) => [m.budgetView, m.bindBudget] },
  '/insights': { title: 'Insights', sub: 'Movers, unusual spends, subscription audit and weekday patterns.', nav: 'insights', load: () => import('./views/insights.js'), pick: (m) => [m.insightsView, null] },
  '/goals': { title: 'Savings goals', sub: 'Progress rings, monthly amounts needed, one-tap contributions.', nav: 'goals', load: () => import('./views/goals.js'), pick: (m) => [m.goalsView, m.bindGoals] },
  '/bills': { title: 'Bills & calendar', sub: 'Every due date on one calendar — autopay, manual and overdue.', nav: 'bills', load: () => import('./views/bills.js'), pick: (m) => [m.billsView, m.bindBills] },
  '/accounts': { title: 'Accounts & net worth', sub: 'Balances per account and the household net-worth trend.', nav: 'accounts', load: () => import('./views/accounts.js'), pick: (m) => [m.accountsView, null] },
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

// Sidebar + nav badges: month totals and the counts that need attention.
function renderChrome() {
  const state = getState();
  const sel = document.getElementById('month-select');
  // An empty ledger has no months on record; the picker still needs
  // the current month as its one option instead of rendering blank.
  const avail = monthsAvailable();
  sel.innerHTML = (avail.length ? avail : [state.month]).map((m) => `<option value="${m}"${m === state.month ? ' selected' : ''}>${monthLabel(m)}</option>`).join('');
  document.getElementById('nav-tx-count').textContent = state.transactions.length;
  const t = monthTotals(state.month);
  const over = Object.keys(state.budgets).filter((c) => {
    const spent = state.transactions.filter((x) => x.date.startsWith(state.month) && x.category === c && x.amount < 0).reduce((s, x) => s - x.amount, 0);
    return spent > state.budgets[c];
  }).length;
  document.getElementById('nav-budget-alert').textContent = over ? `${over} over` : '';
  // "Due" means due now: unpaid with a due date today or earlier.
  // Counting every unpaid bill in a future month would badge
  // December "10 due" before any December due date arrives.
  const unpaid = billsForMonth(state.month).filter((b) => !b.paid && b.date <= TODAY).length;
  document.getElementById('nav-bills-due').textContent = unpaid ? `${unpaid} due` : '';
  document.getElementById('side-summary').innerHTML =
    `<h3>${monthLabel(state.month)}</h3>
     <div class="row"><span>Income</span><b>${fmt0(t.income)}</b></div>
     <div class="row"><span>Spent</span><b>${fmt0(t.spent)}</b></div>
     <div class="row"><span>Kept</span><b>${fmt0(t.income - t.spent)}</b></div>
     <div class="row"><span>To savings</span><b>${fmt0(t.saved)}</b></div>`;
}

// Guards against a slow lazy load landing after the user has already
// navigated elsewhere: only the latest render may paint.
let renderSeq = 0;
async function render() {
  const seq = ++renderSeq;
  // The stored month can go stale: deleting (or re-dating) every
  // transaction in it leaves the picker showing one month while the
  // page renders another month's zeros. Fall back to the latest month
  // that still has transactions so the control and the page agree.
  const avail = monthsAvailable();
  if (avail.length && !avail.includes(getState().month)) setMonth(avail[avail.length - 1]);
  const route = ROUTES[location.hash.replace(/^#/, '')] || ROUTES['/'];
  document.getElementById('page-title').textContent = route.title;
  document.getElementById('page-sub').textContent = route.sub;
  document.title = `HearthLedger — ${route.title}`;
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === route.nav));
  let view = route.view, bind = null;
  if (route.load) {
    // The site runs from its own files with no network, so a failed
    // lazy load is a reload-and-retry, never a connection to check.
    try { [view, bind] = route.pick(await route.load()); }
    catch (e) { if (seq === renderSeq) app.innerHTML = '<p class="empty-note">That page failed to load — reload the page and try again.</p>'; return; }
    if (seq !== renderSeq) return;
  }
  app.innerHTML = view();
  renderChrome();
  if (bind) bind({ render, toast });
  window.scrollTo(0, 0);
}

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
