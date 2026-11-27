// HearthLedger v2 state: localStorage-backed store plus every derived
// figure the views need — month totals, category spend, recurring-payment
// detection, anomaly flags, month-over-month movers, account balances.
import { ACCOUNTS, CATEGORIES, TODAY, seedState } from './seed.js';

const KEY = 'hearthledger-v2-state';
let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === 2 && Array.isArray(parsed.transactions)) return parsed;
    }
  } catch (e) { /* fall through to seed */ }
  return seedState();
}

export function getState() { return state; }
export function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage full/blocked: keep in-memory */ } }
export function resetDemo() { state = seedState(); save(); }
export function setMonth(month) { state.month = month; save(); }

let idSeq = 100000;
export function nextId(prefix) { return prefix + (++idSeq) + Math.floor(Math.random() * 997); }

export function addTransaction(tx) { state.transactions.push(tx); state.transactions.sort(byDate); save(); }
export function updateTransaction(id, patch) {
  const t = state.transactions.find((x) => x.id === id);
  if (t) { Object.assign(t, patch); state.transactions.sort(byDate); save(); }
}
export function deleteTransaction(id) {
  state.transactions = state.transactions.filter((x) => x.id !== id); save();
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
export function isBillPaid(billId, month) { return (state.paidBills[month] || []).includes(billId); }

function byDate(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; }
export function categoryOf(id) { return CATEGORIES.find((c) => c.id === id) || { id, label: id, color: '#999' }; }
export function accountOf(id) { return ACCOUNTS.find((a) => a.id === id) || { id, label: id }; }

// ---------- month helpers ----------
export function monthOf(dateStr) { return dateStr.slice(0, 7); }
export function monthsAvailable() {
  const set = new Set(state.transactions.map((t) => monthOf(t.date)));
  return Array.from(set).sort();
}
export function prevMonth(month) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
export function monthTransactions(month) { return state.transactions.filter((t) => monthOf(t.date) === month); }
export function monthTotals(month) {
  let income = 0, spent = 0, saved = 0;
  for (const t of monthTransactions(month)) {
    if (t.category === 'income') income += t.amount;
    else if (t.category === 'savings') saved += -t.amount;
    else if (t.amount < 0 && t.category !== 'transfer') spent += -t.amount;
  }
  return { income, spent, saved, net: income - spent - saved, savingsRate: income > 0 ? (income - spent) / income : 0 };
}
export function spendingByCategory(month) {
  const map = new Map();
  for (const t of monthTransactions(month)) {
    if (t.amount < 0 && t.category !== 'savings' && t.category !== 'transfer') map.set(t.category, (map.get(t.category) || 0) + (-t.amount));
  }
  return Array.from(map.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}
export function spentInCategory(month, category) {
  return monthTransactions(month)
    .filter((t) => t.category === category && t.amount < 0)
    .reduce((s, t) => s + (-t.amount), 0);
}

// Cash-flow series: income vs spending for every month on record.
export function cashFlowSeries() {
  return monthsAvailable().map((m) => {
    const t = monthTotals(m);
    return { month: m, income: t.income, spent: t.spent, net: t.income - t.spent };
  });
}

// ---------- recurring detection ----------
// A merchant counts as recurring when the same description (or an explicit
// recurring flag) shows up in at least 3 different months.
export function recurringMerchants() {
  const byDesc = new Map();
  for (const t of state.transactions) {
    if (t.amount >= 0 || t.category === 'transfer' || t.category === 'savings') continue;
    const key = t.desc;
    if (!byDesc.has(key)) byDesc.set(key, { desc: key, category: t.category, months: new Set(), amounts: [], flagged: false });
    const r = byDesc.get(key);
    r.months.add(monthOf(t.date));
    r.amounts.push(-t.amount);
    if (t.recurring) r.flagged = true;
  }
  return Array.from(byDesc.values())
    .filter((r) => r.flagged || r.months.size >= 3)
    .map((r) => ({
      desc: r.desc, category: r.category, months: r.months.size,
      typical: r.amounts.slice().sort((a, b) => a - b)[Math.floor(r.amounts.length / 2)],
      yearly: (r.amounts.reduce((s, x) => s + x, 0) / r.amounts.length) * 12,
    }))
    .sort((a, b) => b.yearly - a.yearly);
}
export function isRecurringTx(t) {
  if (t.recurring) return true;
  return recurringMerchants().some((r) => r.desc === t.desc);
}

// ---------- insights: anomalies, movers, merchants ----------
// Anomaly = an expense at least twice its category's median ticket and at
// least $75, in the chosen month.
export function anomalies(month) {
  const medians = new Map();
  for (const c of CATEGORIES) {
    const amounts = state.transactions
      .filter((t) => t.category === c.id && t.amount < 0)
      .map((t) => -t.amount).sort((a, b) => a - b);
    if (amounts.length) medians.set(c.id, amounts[Math.floor(amounts.length / 2)]);
  }
  return monthTransactions(month)
    .filter((t) => t.amount < 0 && t.category !== 'savings' && t.category !== 'transfer')
    .filter((t) => { const med = medians.get(t.category) || 0; return -t.amount >= 75 && -t.amount >= med * 2; })
    .map((t) => ({ tx: t, median: medians.get(t.category), ratio: (-t.amount) / (medians.get(t.category) || 1) }))
    .sort((a, b) => b.ratio - a.ratio);
}

// Biggest category movers vs the previous month (absolute dollars).
export function monthMovers(month) {
  const prev = prevMonth(month);
  const now = new Map(spendingByCategory(month).map((r) => [r.category, r.total]));
  const before = new Map(spendingByCategory(prev).map((r) => [r.category, r.total]));
  const cats = new Set([...now.keys(), ...before.keys()]);
  return Array.from(cats).map((category) => {
    const cur = now.get(category) || 0, old = before.get(category) || 0;
    return { category, cur, old, delta: cur - old, pct: old > 0 ? (cur - old) / old : (cur > 0 ? 1 : 0) };
  }).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

export function topMerchants(month, limit) {
  const map = new Map();
  for (const t of monthTransactions(month)) {
    if (t.amount >= 0 || t.category === 'savings' || t.category === 'transfer') continue;
    const r = map.get(t.desc) || { desc: t.desc, category: t.category, total: 0, count: 0 };
    r.total += -t.amount; r.count += 1; map.set(t.desc, r);
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, limit || 6);
}

// Average spend per weekday (Mon..Sun) across all history.
export function weekdayPattern() {
  const sums = [0, 0, 0, 0, 0, 0, 0], counts = [0, 0, 0, 0, 0, 0, 0];
  for (const t of state.transactions) {
    if (t.amount >= 0 || t.category === 'savings' || t.category === 'transfer') continue;
    const dow = (new Date(t.date + 'T12:00:00').getDay() + 6) % 7; // Mon=0
    sums[dow] += -t.amount; counts[dow] += 1;
  }
  return sums.map((s, i) => ({ day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i], avg: counts[i] ? s / counts[i] : 0, total: s }));
}

// ---------- bills & accounts ----------
export function billsForMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return state.bills
    .filter((b) => !b.quarterly || [1, 4, 7, 10].includes(m))
    .map((b) => Object.assign({}, b, {
      date: month + '-' + String(b.dueDay).padStart(2, '0'),
      paid: isBillPaid(b.id, month),
      overdue: !isBillPaid(b.id, month) && (month + '-' + String(b.dueDay).padStart(2, '0')) < TODAY && month === monthOf(TODAY),
    }))
    .sort((a, b) => a.dueDay - b.dueDay);
}
export function upcomingBills(withinDays) {
  const month = monthOf(TODAY);
  const horizon = new Date(TODAY + 'T12:00:00'); horizon.setDate(horizon.getDate() + withinDays);
  const horizonStr = horizon.toISOString().slice(0, 10);
  return billsForMonth(month).filter((b) => !b.paid && b.date >= TODAY && b.date <= horizonStr);
}
export function accountBalances() {
  return ACCOUNTS.map((a) => {
    const delta = state.transactions.filter((t) => t.account === a.id).reduce((s, t) => s + t.amount, 0);
    return { id: a.id, label: a.label, kind: a.kind, opening: a.opening, balance: a.opening + delta };
  });
}
export function netWorthNow() {
  return accountBalances().reduce((s, a) => s + a.balance, 0);
}

// ---------- formatting ----------
export function fmt(n) {
  const v = Math.round(n * 100) / 100;
  return (v < 0 ? '-$' : '$') + Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function fmt0(n) { return (n < 0 ? '-$' : '$') + Math.abs(Math.round(n)).toLocaleString('en-US'); }
export function pct(x) { return Math.round(x * 100) + '%'; }
export function monthLabel(id) {
  const [y, m] = id.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}
export function shortMonth(id) {
  const [y, m] = id.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short' });
}
export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
