// Bills & calendar: every due date on one month calendar (autopay,
// manual, paid, overdue) plus a bills table with mark-paid toggles.
import { TODAY } from '../seed.js';
import { esc, fmt, fmt0, monthLabel, shortMonth } from '../format.js';
import { getState, toggleBillPaid } from '../store.js';
import { accountOf, billsForMonth } from '../stats.js';
import { daysInMonth, kpiCard } from './shared.js';

export function billsView() {
  const state = getState(), month = state.month;
  const bills = billsForMonth(month);
  const total = bills.reduce((s, b) => s + b.amount, 0);
  const paidTotal = bills.filter((b) => b.paid).reduce((s, b) => s + b.amount, 0);
  const overdueCount = bills.filter((b) => b.overdue).length;
  const [y, m] = month.split('-').map(Number);
  const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7; // Mon=0
  const dim = daysInMonth(month);
  const byDay = new Map();
  for (const b of bills) { if (!byDay.has(b.dueDay)) byDay.set(b.dueDay, []); byDay.get(b.dueDay).push(b); }

  let cells = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<div class="cal-dow">${d}</div>`).join('');
  for (let i = 0; i < firstDow; i++) cells += '<div class="cal-day blank"></div>';
  for (let d = 1; d <= dim; d++) {
    const dateStr = `${month}-${String(d).padStart(2, '0')}`;
    const dayBills = byDay.get(d) || [];
    cells += `<div class="cal-day${dateStr === TODAY ? ' today' : ''}"><span class="dnum">${d}</span>`
      + dayBills.map((b) => `<span class="cal-bill${b.paid ? ' paid' : b.autopay ? ' auto' : ''}" title="${esc(b.name)} — ${fmt(b.amount)}${b.estimated ? ' (est.)' : ''}">${esc(b.name.split(' — ')[0])} ${fmt0(b.amount)}${b.estimated ? ' est.' : ''}</span>`).join('')
      + `</div>`;
  }

  return `<div class="grid kpis">
    ${kpiCard(`Due in ${shortMonth(month)}`, fmt0(total), `${bills.length} bills &amp; subscriptions`)}
    ${kpiCard('Already paid', fmt0(paidTotal), `${bills.filter((b) => b.paid).length} of ${bills.length} settled`)}
    ${kpiCard('Still to go', fmt0(total - paidTotal), overdueCount ? `${overdueCount} overdue!` : 'Nothing overdue', overdueCount ? 'neg' : '')}
    ${kpiCard('On autopay', String(bills.filter((b) => b.autopay).length), `of ${bills.length} bills`)}
  </div>
  <section class="card section-gap"><div class="card-head"><h2>${monthLabel(month)} calendar</h2><span class="card-sub head-note">Amber = manual, teal = autopay, struck-through = paid.</span></div>
  <div class="cal-grid">${cells}</div></section>
  <section class="card section-gap"><div class="card-head"><h2>All bills — ${monthLabel(month)}</h2></div>
  <table><thead><tr><th>Bill</th><th>Due</th><th>Account</th><th class="num">Amount</th><th>Status</th><th class="num">Action</th></tr></thead><tbody>
  ${bills.map((b) => `<tr><td><b>${esc(b.name)}</b>${b.quarterly ? ' <span class="chip grey">quarterly</span>' : ''}</td><td>${b.date}</td><td>${esc(accountOf(b.account).label)}</td><td class="num">${fmt(b.amount)}${b.estimated ? ' <span class="chip grey">est.</span>' : ''}</td>
    <td>${b.paid ? '<span class="chip">paid</span>' : b.overdue ? '<span class="chip red">overdue</span>' : b.autopay ? '<span class="chip">autopay</span>' : '<span class="chip amber">manual</span>'}</td>
    <td class="num"><button class="btn small" data-bill="${b.id}">${b.paid ? 'Mark unpaid' : 'Mark paid'}</button></td></tr>`).join('')}
  </tbody></table></section>`;
}

export function bindBills({ render, toast }) {
  document.querySelectorAll('[data-bill]').forEach((b) => b.addEventListener('click', () => {
    toggleBillPaid(b.dataset.bill, getState().month);
    toast('Bill status updated'); render();
  }));
}
