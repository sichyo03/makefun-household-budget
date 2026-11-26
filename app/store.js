// State store: loads seed data, persists edits to localStorage, and offers
// small aggregation helpers the views share. No network is ever touched.

import { seedState } from './data.js';

const KEY = 'hearthledger-v1';

let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.transactions) && parsed.budgets) return parsed;
    }
  } catch (err) {
    // Storage may be unavailable (private mode); fall back to seed data.
  }
  return seedState();
}

export function getState() {
  return state;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (err) {
    // In-memory state still works for the session.
  }
}

export function resetDemo() {
  state = seedState();
  save();
}

export function setMonth(month) {
  state.month = month;
  save();
}

let uidCounter = 1000;
export function nextId(prefix) {
  uidCounter += 1;
  return prefix + uidCounter + '-' + Math.floor(Math.random() * 1e6);
}

export function addTransaction(tx) {
  state.transactions.push(tx);
  save();
}

export function updateTransaction(id, patch) {
  const row = state.transactions.find((t) => t.id === id);
  if (row) Object.assign(row, patch);
  save();
}

export function deleteTransaction(id) {
  state.transactions = state.transactions.filter((t) => t.id !== id);
  save();
}

export function setBudget(category, amount) {
  state.budgets[category] = amount;
  save();
}

export function contributeToGoal(id, amount) {
  const goal = state.goals.find((g) => g.id === id);
  // Clamp at the target so an over-generous contribution never shows a
  // goal as more than 100% funded.
  if (goal) goal.saved = Math.min(goal.target, goal.saved + amount);
  save();
}

export function addGoal(goal) {
  state.goals.push(goal);
  save();
}

export function toggleBillPaid(id) {
  const bill = state.bills.find((b) => b.id === id);
  if (bill) bill.paid = !bill.paid;
  save();
}

// ---- aggregations -------------------------------------------------------

export function monthTransactions(month) {
  return state.transactions
    .filter((t) => t.date.startsWith(month))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function monthTotals(month) {
  let income = 0;
  let spending = 0;
  let saved = 0;
  for (const t of state.transactions) {
    if (!t.date.startsWith(month)) continue;
    if (t.category === 'income') income += t.amount;
    else if (t.category === 'savings') saved += -t.amount;
    else spending += -t.amount;
  }
  return { income, spending, saved, balance: income - spending - saved };
}

export function spendingByCategory(month) {
  const totals = new Map();
  for (const t of state.transactions) {
    if (!t.date.startsWith(month)) continue;
    if (t.category === 'income' || t.category === 'savings') continue;
    totals.set(t.category, (totals.get(t.category) || 0) + (-t.amount));
  }
  return [...totals.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

export function spentInCategory(month, category) {
  let total = 0;
  for (const t of state.transactions) {
    if (t.date.startsWith(month) && t.category === category) total += -t.amount;
  }
  return total;
}

export function upcomingBills() {
  return [...state.bills].sort((a, b) => (a.due < b.due ? -1 : 1));
}

export function nextBillTotal() {
  return state.bills.filter((b) => !b.paid).reduce((sum, b) => sum + b.amount, 0);
}
