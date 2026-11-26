// HearthLedger boot + hash router. Routes: #/ (dashboard),
// #/transactions, #/budget, #/insights, #/goals, #/bills.
// The router re-renders <main> on every hash change and after edits.

import { getState } from './store.js';
import {
  bindBills, bindBudget, bindCommon, bindGoals, bindTransactions,
  billsView, budgetView, dashboardView, goalsView, insightsView,
  transactionsView,
} from './views.js';

const ROUTES = [
  { hash: '#/', label: 'Dashboard', view: dashboardView, bind: null },
  { hash: '#/transactions', label: 'Transactions', view: transactionsView, bind: bindTransactions },
  { hash: '#/budget', label: 'Budget planner', view: budgetView, bind: bindBudget },
  { hash: '#/insights', label: 'Insights', view: insightsView, bind: null },
  { hash: '#/goals', label: 'Savings goals', view: goalsView, bind: bindGoals },
  { hash: '#/bills', label: 'Bills & reminders', view: billsView, bind: bindBills },
];

function currentRoute() {
  // Unknown hashes (a typo, an old bookmark) land on the dashboard
  // instead of a blank page.
  const hash = location.hash || '#/';
  return ROUTES.find((r) => r.hash === hash) || ROUTES[0];
}

function render(keepFocus) {
  const route = currentRoute();
  const main = document.querySelector('#app');
  const state = getState();
  const activeId = keepFocus && document.activeElement ? document.activeElement.id : null;
  const activeValue = activeId ? document.activeElement.value : null;

  main.innerHTML = route.view(state);
  document.querySelectorAll('.nav a').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('href') === route.hash);
  });
  document.title = 'HearthLedger — ' + route.label;

  bindCommon(main, render);
  if (route.bind) route.bind(main, render);

  if (activeId) {
    const el = document.getElementById(activeId);
    if (el) {
      el.focus();
      if (typeof el.setSelectionRange === 'function' && activeValue !== null) {
        el.setSelectionRange(activeValue.length, activeValue.length);
      }
    }
  }
}

window.addEventListener('hashchange', () => render(false));
render(false);
