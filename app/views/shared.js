// Small building blocks shared by the view modules: KPI cards, ledger
// rows, month-pace helpers, and the transactions page's filter/editing
// state (kept here so main.js can reset it without loading the view).
import { CATEGORIES, TODAY } from '../seed.js';
import { esc, fmt } from '../format.js';
import { accountOf, categoryOf, isRecurringTx } from '../stats.js';

export const COLORS = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.color]));

export function kpiCard(label, value, sub, cls = '') {
  return `<div class="card kpi"><div class="kpi-label">${esc(label)}</div>
    <div class="kpi-value ${cls}">${value}</div>
    <div class="kpi-sub">${sub}</div></div>`;
}

export function txRow(t, { actions = false } = {}) {
  const cat = categoryOf(t.category);
  const rec = isRecurringTx(t) ? ' <span class="chip grey" title="Recurring payment">recurring</span>' : '';
  const act = actions
    ? `<td class="num"><span class="row-actions"><button class="icon-btn" data-edit="${t.id}" title="Edit">&#9998;</button><button class="icon-btn" data-del="${t.id}" title="Delete">&#10005;</button></span></td>` : '';
  return `<tr><td><div class="tx-desc">${esc(t.desc)}${rec}</div>
    <div class="tx-meta">${t.date} &middot; ${esc(accountOf(t.account).label)}</div></td>
    <td><span class="cat-dot" style="background:${cat.color}"></span>${esc(cat.label)}</td>
    <td class="num ${t.amount >= 0 ? 'pos' : ''}">${fmt(t.amount)}</td>${act}</tr>`;
}

export function daysInMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

// How far through the current month "today" sits (null for closed months).
export function paceFrac(month) {
  if (month !== TODAY.slice(0, 7)) return null;
  return Number(TODAY.slice(8, 10)) / daysInMonth(month);
}

// A month with no pace is either finished or not yet begun — the labels
// must say which (a December transaction makes December selectable, and
// it is not "closed").
export function monthPhase(month) {
  const cur = TODAY.slice(0, 7);
  return month === cur ? 'current' : month < cur ? 'past' : 'future';
}

// Transactions page state: active filters + which row is being edited.
export const txFilter = { q: '', category: 'all', account: 'all', type: 'all', month: 'all' };
let editingId = null;
export function setEditing(id) { editingId = id; }
export function getEditing() { return editingId; }
