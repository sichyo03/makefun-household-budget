// The ledger store: one state object, persisted to localStorage, with
// every mutation the UI can make. Derived figures live in stats.js;
// this file only owns the data and how it changes.
import { seedState } from './seed.js';

const KEY = 'hearthledger-v3-state';
let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 3 && Array.isArray(parsed.transactions)) return parsed;
    }
  } catch (e) { /* storage unavailable or corrupt: fall through to the seed */ }
  return seedState();
}

export function getState() { return state; }

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { /* storage full or blocked: keep working in memory */ }
}

export function resetDemo() { state = seedState(); save(); }
export function setMonth(month) { state.month = month; save(); }

let idSeq = 100000;
export function nextId(prefix) { return `${prefix}${++idSeq}${Math.floor(Math.random() * 997)}`; }

const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

export function addTransaction(tx) {
  state.transactions.push(tx);
  state.transactions.sort(byDate);
  save();
}

export function updateTransaction(id, patch) {
  const t = state.transactions.find((x) => x.id === id);
  if (t) { Object.assign(t, patch); state.transactions.sort(byDate); save(); }
}

export function deleteTransaction(id) {
  state.transactions = state.transactions.filter((x) => x.id !== id);
  save();
}

export function setBudget(category, amount) { state.budgets[category] = amount; save(); }

export function contributeToGoal(id, amount) {
  const g = state.goals.find((x) => x.id === id);
  if (g) { g.saved = Math.min(g.target, Math.max(0, g.saved + amount)); save(); }
}

export function addGoal(goal) { state.goals.push(goal); save(); }

export function toggleBillPaid(billId, month) {
  const list = state.paidBills[month] || (state.paidBills[month] = []);
  const i = list.indexOf(billId);
  if (i >= 0) list.splice(i, 1); else list.push(billId);
  save();
}

export function isBillPaid(billId, month) {
  return (state.paidBills[month] || []).includes(billId);
}
