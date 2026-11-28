// Derived figures shared across views: month totals, category spend,
// recurring-payment detection, anomaly flags, bills and account
// balances. Figures only one lazy view needs (Insights movers,
// merchants and weekday pattern; the Accounts net-worth series; the
// Budget per-category spend) live in that view, so the first load
// carries only what the dashboard and the chrome use. All pure reads
// over store.js state; nothing here mutates.
import { ACCOUNTS, CATEGORIES, TODAY } from './seed.js';
import { getState, isBillPaid } from './store.js';

export function categoryOf(id) {
  return CATEGORIES.find((c) => c.id === id) || { id, label: id, color: '#999' };
}
export function accountOf(id) {
  return ACCOUNTS.find((a) => a.id === id) || { id, label: id };
}

// ---------- months ----------
export const monthOf = (dateStr) => dateStr.slice(0, 7);

export function monthsAvailable() {
  return [...new Set(getState().transactions.map((t) => monthOf(t.date)))].sort();
}

export function prevMonth(month) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function nextMonth(month) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthTransactions(month) {
  return getState().transactions.filter((t) => monthOf(t.date) === month);
}

export function monthTotals(month) {
  let income = 0, spent = 0, saved = 0;
  for (const t of monthTransactions(month)) {
    if (t.category === 'income') income += t.amount;
    else if (t.category === 'savings') saved += -t.amount;
    else if (t.amount < 0 && t.category !== 'transfer') spent += -t.amount;
  }
  // With no income the rate is undefined, not 0%: a month that spent
  // $3,797 on $0 income did not break even, so callers show "—".
  return { income, spent, saved, net: income - spent - saved, savingsRate: income > 0 ? (income - spent) / income : null };
}

export function spendingByCategory(month) {
  const map = new Map();
  for (const t of monthTransactions(month)) {
    if (t.amount < 0 && t.category !== 'savings' && t.category !== 'transfer') {
      map.set(t.category, (map.get(t.category) || 0) + (-t.amount));
    }
  }
  return [...map.entries()]
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

// Income vs spending for every month on record, for the cash-flow chart.
export function cashFlowSeries() {
  return monthsAvailable().map((m) => {
    const t = monthTotals(m);
    return { month: m, income: t.income, spent: t.spent, net: t.income - t.spent };
  });
}

// ---------- recurring detection ----------
// A merchant counts as recurring when the seed flags it, or when the
// *same charge* (same description and same amount) repeats in at least
// 3 different months. Same shop at varying amounts is just shopping —
// grocery runs that happen to share a description are not a subscription.
export function recurringMerchants() {
  const byDesc = new Map();
  for (const t of getState().transactions) {
    if (t.amount >= 0 || t.category === 'transfer' || t.category === 'savings') continue;
    if (!byDesc.has(t.desc)) {
      byDesc.set(t.desc, { desc: t.desc, category: t.category, months: new Set(), amounts: [], flagged: false, byAmount: new Map() });
    }
    const r = byDesc.get(t.desc);
    const amt = -t.amount;
    r.months.add(monthOf(t.date));
    r.amounts.push(amt);
    if (!r.byAmount.has(amt)) r.byAmount.set(amt, new Set());
    r.byAmount.get(amt).add(monthOf(t.date));
    if (t.recurring) r.flagged = true;
  }
  return [...byDesc.values()]
    .filter((r) => r.flagged || [...r.byAmount.values()].some((ms) => ms.size >= 3))
    .map((r) => {
      // One definition for both columns: the yearly cost is the typical
      // (median) charge times twelve, so the audit's $/mo and $/yr
      // figures always agree with each other.
      const typical = r.amounts.slice().sort((a, b) => a - b)[Math.floor(r.amounts.length / 2)];
      return { desc: r.desc, category: r.category, months: r.months.size, typical, yearly: typical * 12 };
    })
    .sort((a, b) => b.yearly - a.yearly);
}

export function isRecurringTx(t) {
  return Boolean(t.recurring) || recurringMerchants().some((r) => r.desc === t.desc);
}

// ---------- insights ----------
// Anomaly: an expense at least twice its category's median ticket and at
// least $75, in the chosen month.
export function anomalies(month) {
  const medians = new Map();
  for (const c of CATEGORIES) {
    const amounts = getState().transactions
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

// ---------- bills & accounts ----------
// A bill's seed amount is the *typical* charge. When the ledger already
// carries that month's actual charge (same due day, category and
// account), the bill shows the actual amount so the Bills page totals
// reconcile with Transactions to the cent; bills with no charge yet
// (upcoming months) keep the typical amount and are flagged estimated.
export function billsForMonth(month) {
  const m = Number(month.split('-')[1]);
  const txs = monthTransactions(month);
  return getState().bills
    .filter((b) => !b.quarterly || [1, 4, 7, 10].includes(m))
    .map((b) => {
      const date = `${month}-${String(b.dueDay).padStart(2, '0')}`;
      const paid = isBillPaid(b.id, month);
      const hits = txs.filter((t) => t.date === date && t.category === b.category && t.account === b.account && t.amount < 0);
      const actual = hits.length === 1 ? -hits[0].amount : null;
      // Overdue is simply unpaid and past its due date — including a
      // closed month's bill the user unmarks, not just this month's.
      return { ...b, amount: actual ?? b.amount, estimated: actual === null, date, paid, overdue: !paid && date < TODAY };
    })
    .sort((a, b) => a.dueDay - b.dueDay);
}

// Unpaid bills that need attention now: anything already overdue
// (this month or last — an unmarked bill from a closed month is still
// owed) plus everything due through the horizon, spanning the month
// boundary (late-November "due soon" must see early-December bills).
// Sorted by due date, so overdue bills come first. Without the overdue
// rows the dashboard could say "all clear" next to a bill that is
// already late.
export function upcomingBills(withinDays) {
  const horizon = new Date(`${TODAY}T12:00:00`);
  horizon.setDate(horizon.getDate() + withinDays);
  const horizonStr = horizon.toISOString().slice(0, 10);
  const cur = monthOf(TODAY);
  return [...billsForMonth(prevMonth(cur)), ...billsForMonth(cur), ...billsForMonth(nextMonth(cur))]
    .filter((b) => !b.paid && b.date <= horizonStr)
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function accountBalances() {
  const txs = getState().transactions;
  return ACCOUNTS.map((a) => {
    const delta = txs.filter((t) => t.account === a.id).reduce((s, t) => s + t.amount, 0);
    return { id: a.id, label: a.label, kind: a.kind, opening: a.opening, balance: a.opening + delta };
  });
}

export function netWorthNow() {
  return accountBalances().reduce((s, a) => s + a.balance, 0);
}
